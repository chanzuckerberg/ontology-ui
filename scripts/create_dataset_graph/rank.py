import os
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

import tiledb
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests

from .common import chunker, OBS_TERM_COLUMNS


def do_ranking(uri, chunk_index, var_ids, tdb_config, init_buffer_bytes, verbose):
    with tiledb.open(
        f"{uri}/raw_X_normed", config=tdb_config | {"py.init_buffer_bytes": init_buffer_bytes}
    ) as raw_X_normed:
        with tiledb.open(f"{uri}/raw_X_ranked", mode="w", config=tdb_config) as raw_X_ranked:
            if verbose:
                print(f"chunk {chunk_index} starting...")
            var_ids = var_ids.to_list()
            genes = raw_X_normed.df[var_ids]
            if verbose:
                print(f"chunk {chunk_index} read...")
            genes.drop_duplicates(subset=["obs_id", "var_id"], inplace=True)
            if len(genes) > 0:
                genes["ranking"] = genes.groupby(by="var_id")["value"].rank()
                raw_X_ranked[genes.var_id] = {"obs_id": genes.obs_id, "value": genes.ranking}


def rank_cells(*, uri: str, tdb_config: dict, verbose: bool = False, **other):
    """
    For each gene, rank by normalized raw X value
    """
    ctx = tiledb.Ctx(tdb_config)

    with tiledb.open(f"{uri}/var", ctx=ctx) as var:
        var_df = var.query(attrs=[]).df[:]
        n_var = len(var_df)

    with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
        n_obs = len(obs.query(attrs=[]).df[:])

    # rather than doing this, we could use return_incomplete
    sparsity_guess = 0.9
    row_size_guess = 32  # obs_id average length SWAG
    init_buffer_bytes = 16 * 1024 ** 3
    chunk_size = max(1, init_buffer_bytes // int(n_obs * sparsity_guess * row_size_guess))
    if verbose:
        print(f"n_var={n_var}, n_obs={n_obs}, chunk_size={chunk_size}")

    with ProcessPoolExecutor(max(4, os.cpu_count() // 8)) as tp:
        count = 0
        result_futures = [
            tp.submit(do_ranking, uri, chunk[0], chunk[1], tdb_config, init_buffer_bytes, verbose)
            for chunk in enumerate(chunker(var_df.index, chunk_size))
        ]
        for future in as_completed(result_futures):
            try:
                future.result()
            except Exception as e:
                print("Error", e)

            count += 1
            if verbose:
                print(f"chunk {count} of {len(result_futures)} complete.")


def rank_genes_groups(
    *,
    uri: str,
    obs_df: pd.DataFrame = None,
    var_df: pd.DataFrame = None,
    groupby,
    top_n: int,
    verbose: bool,
    tdb_config: dict,
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

    if obs_df is None:
        with tiledb.open(f"{uri}/obs", ctx=ctx) as obs:
            obs_df = obs.query(attrs=groupby).df[:]

    if var_df is None:
        with tiledb.open(f"{uri}/var", ctx=ctx) as var:
            var_df = var.df[:]

    results = {
        k: _rank_genes_groups(
            uri=uri,
            obs_df=obs_df,
            var_df=var_df,
            groupby_key=k,
            top_n=top_n,
            verbose=verbose,
            ctx=ctx,
        )
        for k in groupby
    }
    print(json.dumps(results), file=output)
    return 0


def _rank_genes_groups(
    uri: str,
    obs_df: pd.DataFrame,
    var_df: pd.DataFrame,
    groupby_key: str,
    top_n: int,
    verbose: bool,
    ctx: tiledb.Ctx,
):
    if verbose:
        print(f"rank_genes_groups starting {groupby_key}....")

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
        print(f"rank_genes_groups: {len(groups)} types, {len(var_df)} genes, {n_gene_groups} groups")

    def sum_raw_X_normed() -> pd.Series:
        with tiledb.open(f"{uri}/raw_X_normed", ctx=ctx) as raw_X_normed:
            chunk_size = 100
            for chunk_idx, var_ids in enumerate(chunker(var_df.index, chunk_size)):
                if verbose:
                    print(f"{datetime.now()}: value sum {chunk_idx * chunk_size} of {n_var}")
                all_values = raw_X_normed.df[var_ids.to_list()].set_index("obs_id")
                S = all_values.join(obs_df).groupby(by=["var_id", groupby_key]).value.sum()
                gene_groups.loc[S.index, "S"] = S.to_list()

        return gene_groups.S

    def sum_raw_X_ranked() -> pd.Series:
        total_count = obs_df.groupby(by=[groupby_key])[groupby_key].count().rename("total_count")
        with tiledb.open(f"{uri}/raw_X_ranked", ctx=ctx) as raw_X_ranked:
            chunk_size = 100
            for chunk_idx, var_ids in enumerate(chunker(var_df.index, chunk_size)):
                if verbose:
                    print(f"{datetime.now()}: rank sum {chunk_idx * chunk_size} of {n_var}")
                all_values = raw_X_ranked.df[var_ids.to_list()].set_index("obs_id")
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

        return gene_groups.R

    if verbose:
        print(f"{datetime.now()}: rank_genes_groups - start calculation of S and R")
    # with ThreadPoolExecutor() as tp:
    #     # start
    #     value_sum = tp.submit(sum_raw_X_normed)
    #     rank_sum = tp.submit(sum_raw_X_ranked)
    #     # and wait
    #     value_sum.result()
    #     rank_sum.result()

    sum_raw_X_normed()
    sum_raw_X_ranked()

    if verbose:
        print(f"{datetime.now()}: rank_genes_groups - finished calculation of S and R")

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

    # compute logfoldchange
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

    results = (
        top_n.groupby(level=0)
        .apply(
            lambda df: (
                {
                    "genes": df.xs(df.name).var_id.to_list(),
                    "pvals": df.xs(df.name).pvals.to_list(),
                    "pvals_adj": df.xs(df.name).pvals_adj.to_list(),
                    "lfc": df.xs(df.name).lfc.to_list(),
                    "scores": df.xs(df.name).U.to_list(),
                }
            )
        )
        .to_dict()
    )

    return results
