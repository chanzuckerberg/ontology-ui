import os.path
import random

import anndata
import tiledb
import numpy as np
import pandas as pd
from scipy import sparse

from .common import OBS_TERM_COLUMNS, VAR_TERM_COLUMNS, get_ctypes


def add_h5ad(
    *,
    uri: str,
    h5ad: str,
    dataset_id: str = None,
    tdb_config: dict,
    verbose: bool = False,
    current_schema_only: bool = True,
    **other,
):
    """Open the SOMA, and incrementally merge obs/var and raw into aggregation."""
    ctx = tiledb.Ctx(tdb_config)

    # dataset_id is the H5AD URI by default, or user can override (usually to use a more compact dataset_id)
    dataset_id = dataset_id or h5ad
    if not os.path.exists(h5ad):
        print("H5AD path does not exist", h5ad)
        return 1

    if verbose:
        print("loading...", h5ad)

    ad = anndata.read_h5ad(h5ad)
    cxg_version = get_cellxgene_schema_version(ad)

    if current_schema_only and cxg_version != "2.0.0":
        print("H5AD has old schema version, skipping...", h5ad)
        return 0

    # The schema allows for raw to be in raw.X, unless there is no "final" matrix,
    # in which case it is in X. Determine which is the case.  See normative prose:
    # https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#x-matrix-layers
    #
    # The spec is ambiguous on when the raw.var exists.  Guess.
    #
    if ad.raw is not None and ad.raw.X is not None:
        raw_X = ad.raw.X
        raw_var = ad.raw.var
    else:
        raw_X = ad.X
        raw_var = ad.var

    if raw_X is None or raw_var is None:
        print("H5AD does NOT contain required RAW data. Skipping...", h5ad)
        return 1

    # Create a copy of AnnData from which we slice primary data and genes ONLY.
    ad = anndata.AnnData(X=raw_X, obs=ad.obs, var=raw_var)
    ad = ad[ad.obs.is_primary_data == True, ad.var.feature_biotype == "gene"]
    if ad.n_obs == 0:
        print("H5AD has no primary data, skipping...", h5ad)
        return 1

    # subset axis dataframes to the columns we care about and standardize index name
    obs_df = ad.obs[OBS_TERM_COLUMNS]
    var_df = raw_var[VAR_TERM_COLUMNS]
    var_df.index.rename("var_id", inplace=True)
    obs_df.index.rename("obs_id", inplace=True)

    # make obs IDs globally unique by concatenating with the dataset_id
    obs_df = obs_df.set_index(dataset_id + "_" + obs_df.index)

    # and tie up in an AnnData
    ad = anndata.AnnData(X=ad.X, obs=obs_df, var=var_df)

    if verbose:
        print("saving var...", h5ad)
    save_var(uri, ctx, var_df)

    if verbose:
        print("saving obs...", h5ad)
    column_types, varlen_types = get_ctypes(obs_df)
    tiledb.from_pandas(
        uri=f"{uri}/obs",
        dataframe=obs_df,
        mode="append",
        ctx=ctx,
        column_types=column_types,
        varlen_types=varlen_types,
    )

    save_raw_X_normed(uri, ad, ctx, verbose, h5ad)

    if verbose:
        print("Save complete...", h5ad)

    return 0


def compute_raw_X_normed(raw_X: sparse.spmatrix):
    """
    Normalize each raw count to be the fraction of the total reads per cell.
    This sums the counts by obs (row), and divides it into each value in the
    sparse matrix.
    """
    return sparse.diags((1.0 / raw_X.sum(axis=1)).A1).dot(raw_X).tocoo()


def save_raw_X_normed(uri, ad, ctx, verbose, h5ad):
    if sparse.issparse(ad.X):
        num_samples = 16
        count = 0
        for _ in range(num_samples):
            obs_id = random.randrange(ad.n_obs)
            count = count + ad.X[obs_id, :].nnz
        target = 100_000_000
        chunk_size = int(target // (count / num_samples))
    else:
        chunk_size = min(1, int(target // ad.X.shape[1]))

    X = ad.X
    if X.dtype != np.float32:
        X = X.astype(np.float32)

    obs_names = ad.obs.index.to_numpy()
    with tiledb.open(f"{uri}/raw_X_normed", mode="w", ctx=ctx) as raw_X_normed:
        for chunk in range(0, ad.n_obs, chunk_size):
            if verbose:
                print(f"saving X chunk {chunk//chunk_size + 1} of {ad.n_obs//chunk_size + 1}", h5ad)
            X_sp = sparse.csr_matrix(X[chunk : chunk + chunk_size, :])
            X_coo = compute_raw_X_normed(X_sp)
            obs_ids = obs_names[X_coo.row + chunk].tolist()
            var_ids = ad.var.index[X_coo.col].tolist()
            raw_normed_values = X_coo.data
            raw_X_normed[var_ids] = {
                "obs_id": obs_ids,
                "value": raw_normed_values,
            }


def save_var(uri: str, ctx: tiledb.Ctx, df: pd.DataFrame):
    # Merges var by index column value
    with tiledb.open(f"{uri}/var", ctx=ctx) as agg_var:
        agg_var_df = agg_var.query(dims=["var_id"], attrs=[]).df[:]

    mask = df.index.isin(agg_var_df.index)
    if not mask.all():
        missing_df = df[~mask]
        column_types, varlen_types = get_ctypes(missing_df)
        tiledb.from_pandas(
            uri=f"{uri}/var",
            dataframe=missing_df,
            mode="append",
            ctx=ctx,
            column_types=column_types,
            varlen_types=varlen_types,
        )


def get_cellxgene_schema_version(ad: anndata.AnnData):

    # cellxgene >=2.0
    if "schema_version" in ad.uns:
        # not sure why this is a nested array
        return ad.uns["schema_version"]

    # cellxgene 1.X
    if "version" in ad.uns:
        return ad.uns["version"]["corpora_schema_version"]

    return None
