import os
import json
from concurrent.futures import ProcessPoolExecutor, as_completed
import gc

import tiledb
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests
from progress.bar import Bar

from .common import chunker, OBS_TERM_COLUMNS, log


def do_ranking(uri, chunk_index, var_ids, tdb_config, init_buffer_bytes, verbose):
    gc.collect()
    with tiledb.open(
        f"{uri}/raw_X_normed", config=tdb_config | {"py.init_buffer_bytes": init_buffer_bytes}
    ) as raw_X_normed:
        with tiledb.open(f"{uri}/raw_X_ranked", mode="w", config=tdb_config) as raw_X_ranked:
            if verbose:
                log(f"chunk {chunk_index} starting...")
            var_ids = var_ids.to_list()
            genes = raw_X_normed.df[var_ids]
            if verbose:
                log(f"chunk {chunk_index} read...")
            genes.drop_duplicates(subset=["obs_id", "var_id"], inplace=True)
            if len(genes) > 0:
                genes["ranking"] = genes.groupby(by="var_id")["value"].rank()
                raw_X_ranked[genes.var_id] = {"obs_id": genes.obs_id, "value": genes.ranking}


def rank_cells(*, uri: str, tdb_config: dict, max_workers: int, verbose: bool = False, **other):
    """
    For each gene, rank by normalized raw X value
    """
    ctx = tiledb.Ctx(tdb_config)

    with tiledb.open(f"{uri}/var", ctx=ctx) as var:
        var_df = var.query(dims=["var_id"], attrs=[]).df[:]
        n_var = len(var_df)

    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        n_obs = len(obs.query(dims=["obs_id"], attrs=[]).df[:])

    # rather than doing this, we could use return_incomplete
    init_buffer_bytes = 8 * 1024**3
    chunk_size = guess_at_chunk_size(n_obs, init_buffer_bytes=init_buffer_bytes)
    if verbose:
        log(f"n_var={n_var}, n_obs={n_obs}, chunk_size={chunk_size}")

    max_workers = max(4, os.cpu_count() // 8) if max_workers is None else max_workers
    with ProcessPoolExecutor(max_workers=max_workers) as tp:
        count = 0
        result_futures = [
            tp.submit(do_ranking, uri, chunk[0], chunk[1], tdb_config, init_buffer_bytes, verbose)
            for chunk in enumerate(chunker(var_df.index, chunk_size))
        ]
        with Bar("Ranking cells", max=len(result_futures)) as bar:
            for future in as_completed(result_futures):
                try:
                    future.result()
                except Exception as e:
                    print("Error", e)
                    raise e

                count += 1
                bar.next()


def rank_genes_groups(
    *,
    uri: str,
    groupby,
    top_n: int,
    verbose: bool,
    tdb_config: dict,
    max_workers: int,
    output,
    **other,
):
    ctx = tiledb.Ctx(tdb_config)

    if groupby is None:
        groupby = ["cell_type_ontology_term_id", "tissue_ontology_term_id"]

    for k in groupby:
        if not (k in OBS_TERM_COLUMNS):
            print(f"No such groupby key {k}")
            return 1

    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        obs_df = obs.query(dims=["obs_id"], attrs=groupby).df[:]

    with tiledb.open(f"{uri}/var", ctx=ctx) as var:
        var_df = var.df[:]
    var_df["var_name_str"] = var_df.var_name.to_numpy().astype(str)

    results = {
        k: _rank_genes_groups(
            uri=uri,
            groupby_key=k,
            obs_df=obs_df,
            var_df=var_df,
            top_n=top_n,
            verbose=verbose,
            tdb_config=tdb_config,
            max_workers=max_workers,
        )
        for k in groupby
    }
    print(json.dumps(results), file=output)


def _rank_genes_groups(
    uri: str,
    obs_df: pd.DataFrame,
    var_df: pd.DataFrame,
    groupby_key: str,
    top_n: int,
    verbose: bool,
    tdb_config: dict,
    max_workers: int,
):
    """
    For each gene, calculate:
    * U statistic and pval from X rankings
    * mean and n from normalized X
    """
    n_obs = len(obs_df)
    n_var = len(var_df)

    groups = obs_df[groupby_key].reset_index().groupby(by=[groupby_key]).count().rename(columns={"obs_id": "n"})
    gene_groups = pd.DataFrame(index=pd.MultiIndex.from_product([var_df.index, groups.index]))
    gene_groups = gene_groups.join(groups)
    gene_groups["R"] = 0.0
    gene_groups["S"] = 0.0

    n_gene_groups = len(gene_groups)
    if verbose:
        log(f"rank_genes_groups: {len(groups)} types, {len(var_df)} genes, {n_gene_groups} groups")

    if verbose:
        log("rank_genes_groups: start calculation of S and R")

    n_partitions = max(1, os.cpu_count() // 2) if max_workers is None else max_workers
    partition_chunk_size = max(1, n_var // n_partitions)
    if verbose:
        log(f"partitions: {n_partitions}, partition_chunk_size: {partition_chunk_size}")
    with ProcessPoolExecutor(max_workers=n_partitions) as tp:
        result_futures = []
        for chunk in enumerate(chunker(var_df.index.to_list(), partition_chunk_size)):
            result_futures.append(tp.submit(do_compute_S, uri, groupby_key, chunk[0], chunk[1], tdb_config, verbose))
            result_futures.append(tp.submit(do_compute_R, uri, groupby_key, chunk[0], chunk[1], tdb_config, verbose))

        completed_count = 0

        with Bar(f"Ranking genes for {groupby_key}:", max=len(result_futures)) as bar:
            for future in as_completed(result_futures):
                try:
                    name, result = future.result()
                    series = pd.Series(result, name=name)
                    gene_groups.loc[series.index, name] = series.to_list()

                except Exception as e:
                    print("Error", e)
                    raise e

                completed_count += 1
                gc.collect()
                bar.next()

    if verbose:
        log("rank_genes_groups - finished calculation of S and R")

    # now calculate U statistic, corrected for normal dist.
    # https://en.wikipedia.org/wiki/Mann%E2%80%93Whitney_U_test
    std_dev = (gene_groups.n * (n_obs - gene_groups.n) * (n_obs + 1) / 12.0).to_numpy()
    U = (gene_groups.R - (n_obs * (gene_groups.n + 1) / 2.0)).to_numpy() / std_dev
    U[np.isnan(U)] = 0

    pvals = 2 * stats.distributions.norm.sf(np.abs(U))
    pvals[np.isnan(pvals)] = 1
    # benjamini hochberg fdf correction
    _, pvals_adj, _, _ = multipletests(pvals, alpha=0.05, method="fdr_bh")

    gene_groups["U"] = U
    gene_groups["pvals"] = pvals
    gene_groups["pvals_adj"] = pvals_adj

    # compute log foldchange
    mean = gene_groups.S / gene_groups.n
    S_all = gene_groups.groupby(level=0).S.sum()
    mean_rest = S_all / n_obs
    foldchange = (mean + 1e-9) / (mean_rest + 1e-9)
    gene_groups["lfc"] = np.log2(foldchange)

    top_n = (
        gene_groups.groupby(level=1)[["U", "pvals", "pvals_adj", "lfc"]]
        .apply(lambda x: x.nlargest(top_n, columns=["U"]))
        .reset_index(level=(2, 1))
        .drop(columns=[groupby_key])
    )
    top_n.index = top_n.index.astype(str)

    results = top_n.groupby(level=0).apply(
        lambda df: (
            {
                "genes": var_df.var_name_str[df.xs(df.name).var_id.to_list()].to_list(),
                "pvals": df.xs(df.name).pvals.to_list(),
                "pvals_adj": df.xs(df.name).pvals_adj.to_list(),
                "lfc": df.xs(df.name).lfc.to_list(),
                "scores": df.xs(df.name).U.to_list(),
            }
        )
    )
    return results.to_dict()


def do_compute_S(
    uri: str,
    groupby_key: str,
    partition_index: int,
    var_ids,
    tdb_config: dict,
    verbose: bool,
) -> dict:
    if verbose:
        log(f"value sum, starting partition {partition_index}")

    init_buffer_bytes = 2 * 1024**3
    tdb_config = {**tdb_config, "py.init_buffer_bytes": init_buffer_bytes}
    del tdb_config["sm.tile_cache_size"]
    ctx = tiledb.Ctx(tdb_config)

    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        obs_df = obs.query(attrs=[groupby_key]).df[:]
    n_obs = len(obs_df)

    gene_groups = pd.DataFrame(index=pd.MultiIndex.from_product([var_ids, obs_df[groupby_key].unique()]))
    gene_groups["S"] = 0.0

    with tiledb.open(f"{uri}/raw_X_normed", ctx=ctx) as raw_X_normed:
        chunk_size = guess_at_chunk_size(n_obs, init_buffer_bytes=init_buffer_bytes)
        n_chunks = int(len(var_ids) / chunk_size + 1)
        for chunk_index, chunk_var_ids in enumerate(chunker(var_ids, chunk_size)):
            gc.collect()
            if verbose:
                log(f"value sum, partition {partition_index}, chunk {chunk_index+1} of {n_chunks}")
            all_values = raw_X_normed.df[chunk_var_ids].set_index("obs_id").astype({"value": "float64"})
            S = all_values.join(obs_df).groupby(by=["var_id", groupby_key]).value.sum()
            gene_groups.loc[S.index, "S"] = S.to_list()

    return ("S", gene_groups.S.to_dict())


def do_compute_R(
    uri: str,
    groupby_key: str,
    partition_index: int,
    var_ids,
    tdb_config: dict,
    verbose: bool,
) -> dict:
    if verbose:
        log(f"value rank, starting partition {partition_index}")

    init_buffer_bytes = 2 * 1024**3
    tdb_config = {**tdb_config, "py.init_buffer_bytes": init_buffer_bytes}
    del tdb_config["sm.tile_cache_size"]
    ctx = tiledb.Ctx(tdb_config)

    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        obs_df = obs.query(attrs=[groupby_key]).df[:]
    n_obs = len(obs_df)

    gene_groups = pd.DataFrame(index=pd.MultiIndex.from_product([var_ids, obs_df[groupby_key].unique()]))
    gene_groups["R"] = 0.0

    total_count = obs_df.groupby(by=[groupby_key])[groupby_key].count().rename("total_count")
    with tiledb.open(f"{uri}/raw_X_ranked", ctx=ctx) as raw_X_ranked:
        chunk_size = guess_at_chunk_size(n_obs, init_buffer_bytes=init_buffer_bytes)
        n_chunks = int(len(var_ids) / chunk_size + 1)
        for chunk_index, chunk_var_ids in enumerate(chunker(var_ids, chunk_size)):
            gc.collect()
            if verbose:
                log(f"value rank, partition {partition_index}, chunk {chunk_index+1} of {n_chunks}")
            all_values = raw_X_ranked.df[chunk_var_ids].set_index("obs_id")
            labelled_values = (
                all_values.join(obs_df[groupby_key]).reset_index().set_index("var_id").astype({"value": "float64"})
            )
            R = labelled_values.groupby(by=["var_id", groupby_key]).agg(
                rank_sum=("value", "sum"), nnz_count=("value", "count")
            )
            R = R.join(total_count)

            # Rankings must be adjusted for the number of zeros as it is a sparse array.
            # Where 'N' is the number of zeros for the entire var/feature, the zero filled (missing)
            # values are filled with the average of the first N, ie, (N+1)/2. The remainder
            # are increased by N.
            R = R.join((n_obs - R.groupby("var_id").nnz_count.sum()).rename("N"))
            R["value"] = (R.total_count - R.nnz_count) * (R.N + 1) / 2 + (R.N * R.nnz_count)
            gene_groups.loc[R.index, "R"] = R.value.to_list()

    return ("R", gene_groups.R.to_dict())


def guess_at_chunk_size(n_obs, row_size_guess=8, init_buffer_bytes=2 * 1024**3, sparsity_guess=0.9):
    return max(1, init_buffer_bytes // int(n_obs * (1.0 - sparsity_guess) * row_size_guess))
