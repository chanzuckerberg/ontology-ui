import io
import os.path
import random
from concurrent.futures import ProcessPoolExecutor, as_completed
import gc

import anndata
import tiledb
import numpy as np
import pandas as pd
from scipy import sparse

from .common import OBS_TERM_COLUMNS, VAR_TERM_COLUMNS, get_ctypes, log, parse_manifest


def compute_raw_X_normed(raw_X: sparse.spmatrix):
    """
    Normalize each raw count to be the fraction of the total reads per cell.
    This sums the counts by obs (row), and divides it into each value in the
    sparse matrix.
    """
    return sparse.diags((1.0 / raw_X.sum(axis=1)).A1).dot(raw_X).tocoo()


def load_axes_dataframes(uri: str, datasets: list, ctx: tiledb.Ctx, current_schema_only: bool, verbose: bool):
    # accumulate unique var_ids - ie, merge the datasets on the var/feature axis
    var_names = set()
    obs_row_start_idx = 0

    for h5ad_idx, h5ad in enumerate(datasets):
        if not os.path.exists(h5ad.path):
            log("H5AD path does not exist", h5ad.path)
            continue

        if verbose:
            log(f"Adding {h5ad_idx+1} of {len(datasets)}: {h5ad.path}")

        ad = anndata.read_h5ad(h5ad.path, backed="r")
        cxg_version = get_cellxgene_schema_version(ad)

        if current_schema_only and cxg_version != "2.0.0":
            log("H5AD has old schema version, skipping...", h5ad.path)
            continue

        _, raw_var = get_raw(ad)
        if raw_var is None:
            print("H5AD does NOT contain required RAW data. Skipping...", h5ad.path)
            return

        # Create a copy of AnnData from which we slice primary data and genes ONLY.
        ad = anndata.AnnData(X=None, obs=ad.obs, var=raw_var)
        ad = ad[ad.obs.is_primary_data == True, ad.var.feature_biotype == "gene"]
        if ad.n_obs == 0:
            log("H5AD has no primary data, skipping...", h5ad.path)
            continue

        # subset axis dataframes to the columns we care about and standardize index name
        obs_df = ad.obs[OBS_TERM_COLUMNS].copy()
        obs_df["dataset_id"] = h5ad.dataset_id
        var_df = raw_var[VAR_TERM_COLUMNS]

        # build a set of unique var_name
        var_names |= set(var_df.index)

        # incrementally append obs
        if verbose:
            log("saving obs...", h5ad.path)
        obs_df.index.rename("obs_name", inplace=True)
        obs_df.reset_index(inplace=True)
        column_types, varlen_types = get_ctypes(obs_df)
        tiledb.from_pandas(
            uri=f"{uri}/obs",
            dataframe=obs_df,
            mode="append",
            ctx=ctx,
            column_types=column_types,
            varlen_types=varlen_types,
            row_start_idx=obs_row_start_idx,
        )

        obs_row_start_idx += len(obs_df)

    if verbose:
        log(f"Total rows={obs_row_start_idx}")

    # save var
    if verbose:
        log("saving var...", h5ad.path)
    var_df = pd.DataFrame(data={"var_name": list(var_names)})
    column_types, varlen_types = get_ctypes(var_df)
    tiledb.from_pandas(
        uri=f"{uri}/var",
        dataframe=var_df,
        mode="append",
        ctx=ctx,
        column_types=column_types,
        varlen_types=varlen_types,
        row_start_idx=0,
    )


def load_raw_X_normed(uri: str, h5ad, tdb_config: dict, current_schema_only: bool, verbose: bool):

    if not os.path.exists(h5ad.path):
        log("H5AD path does not exist", h5ad.path)
        return

    if verbose:
        log("loading...", h5ad.path)

    ad = anndata.read_h5ad(h5ad)
    cxg_version = get_cellxgene_schema_version(ad)

    if current_schema_only and cxg_version != "2.0.0":
        log("H5AD has old schema version, skipping...", h5ad.path)
        return

    raw_X, raw_var = get_raw(ad)
    if raw_X is None or raw_var is None:
        log("H5AD does NOT contain required RAW data. Skipping...", h5ad.path)
        return

    # Create a copy of AnnData from which we slice primary data and genes ONLY.
    ad = anndata.AnnData(X=raw_X, obs=ad.obs, var=raw_var, dtype=np.float32)
    ad = ad[ad.obs.is_primary_data == True, ad.var.feature_biotype == "gene"]
    ad = anndata.AnnData(X=ad.X, obs=ad.obs, var=ad.var, dtype=np.float32)
    if ad.n_obs == 0:
        log("H5AD has no primary data, skipping...", h5ad.path)
        return

    ctx = tiledb.Ctx(tdb_config)

    # get the starting row index for this dataset
    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        # there is a bug in QueryCondition
        # qc = tiledb.QueryCondition(f"dataset_id == '{dataset_id}'")
        # row_start_idx_groups = obs.query(attrs=["dataset_id"], attr_cond=qc).df[:].reset_index().groupby("dataset_id").min()
        row_start_idx_groups = obs.query(attrs=["dataset_id"]).df[:].reset_index().groupby("dataset_id").min()
        row_start_idx = row_start_idx_groups.loc[bytes(h5ad.dataset_id, "utf-8"), "index"]

    # get the var_name map
    with tiledb.open(f"{uri}/var", ctx=ctx) as var:
        global_var_ids = var.df[:].reset_index().set_index("var_name")
    ad.var["var_name"] = ad.var.index.astype(bytes)
    var_id_map = ad.var[["var_name"]].join(global_var_ids, on="var_name").var_id.to_numpy()

    save_raw_X_normed(uri, ad, ctx, row_start_idx, var_id_map, h5ad.path, verbose)

    if verbose:
        log("Save complete...", h5ad.path)


def save_raw_X_normed(uri, ad, ctx, row_start_idx, var_id_map, h5ad, verbose):
    target = 500_000_000
    if sparse.issparse(ad.X):
        num_samples = 16
        count = 0
        for _ in range(num_samples):
            obs_id = random.randrange(ad.n_obs)
            count = count + ad.X[obs_id, :].nnz
        chunk_size = int(target // (count / num_samples))
    else:
        chunk_size = min(1, int(target // ad.X.shape[1]))

    X = ad.X
    if X.dtype != np.float32:
        X = X.astype(np.float32)

    with tiledb.open(f"{uri}/raw_X_normed", mode="w", ctx=ctx) as raw_X_normed:
        for chunk in range(0, ad.n_obs, chunk_size):
            gc.collect()
            if verbose:
                log(f"saving X chunk {chunk//chunk_size + 1} of {ad.n_obs//chunk_size + 1}", h5ad)

            X_sp = sparse.csr_matrix(X[chunk : chunk + chunk_size, :])
            X_coo = compute_raw_X_normed(X_sp)

            obs_ids = X_coo.row + (row_start_idx + chunk)
            var_ids = var_id_map[X_coo.col]
            raw_X_normed[var_ids] = {"obs_id": obs_ids, "value": X_coo.data}


def load_X(
    *,
    uri: str,
    manifest: io.TextIOBase,
    tdb_config: dict,
    current_schema_only: bool,
    max_workers: int,
    verbose: bool,
    **other,
):
    # datasets = [d for d in [d.strip() for d in manifest.readlines()] if d.endswith(".h5ad") and os.path.exists(d)]
    datasets = parse_manifest(manifest)
    datasets = [d for d in datasets if d.path.endswith('.h5ad') and os.path.exists(d.path)]

    if len(datasets) == 0:
        print("No H5AD files in the manifest")
        return 1

    max_workers = max(1, os.cpu_count() // 12) if max_workers is None else max_workers
    with ProcessPoolExecutor(max_workers=max_workers) as tp:
        futures = [
            tp.submit(load_raw_X_normed, uri, h5ad, tdb_config, current_schema_only, verbose) for h5ad in datasets
        ]
        count = 0
        for future in as_completed(futures):
            count += 1
            if verbose:
                log(f"loadX: dataset {count} of {len(futures)} complete")


def get_cellxgene_schema_version(ad: anndata.AnnData):

    # cellxgene >=2.0
    if "schema_version" in ad.uns:
        # not sure why this is a nested array
        return ad.uns["schema_version"]

    # cellxgene 1.X
    if "version" in ad.uns:
        return ad.uns["version"]["corpora_schema_version"]

    return None


def get_raw(ad: anndata.AnnData):
    # The schema allows for raw to be in raw.X, unless there is no "final" matrix,
    # in which case it is in X. Determine which is the case.  See normative prose:
    # https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#x-matrix-layers
    #
    # The spec is ambiguous on when the raw.var exists.  Guess.
    #
    if ad.raw is not None and ad.raw.X is not None:
        return (ad.raw.X, ad.raw.var)

    return (ad.X, ad.var)
