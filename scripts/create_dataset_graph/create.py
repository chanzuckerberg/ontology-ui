import io
import os.path

import tiledb
import numpy as np
import pandas as pd

from .common import OBS_TERM_COLUMNS, VAR_TERM_COLUMNS, get_ctypes, log
from .add import load_axes_dataframes


def create_single_value_X_array(uri: str, ctx: tiledb.Ctx):
    if os.path.exists(uri):
        raise Exception(f"Oops, {uri} already exists")

    dom = tiledb.Domain(
        tiledb.Dim(
            name="var_id",
            domain=(np.iinfo("int64").min, np.iinfo("int64").max - 1),
            dtype="int64",
            filters=[tiledb.ZstdFilter()],
        ),
        ctx=ctx,
    )
    attrs = (
        tiledb.Attr(name="obs_id", dtype="int64", filters=[tiledb.ZstdFilter()], ctx=ctx),
        tiledb.Attr(name="value", dtype=np.float32, filters=[tiledb.ZstdFilter()], ctx=ctx),
    )
    schema = tiledb.ArraySchema(
        domain=dom,
        attrs=attrs,
        sparse=True,
        allows_duplicates=True,
        offsets_filters=[tiledb.DoubleDeltaFilter(), tiledb.BitWidthReductionFilter(), tiledb.ZstdFilter()],
        capacity=100000,
        ctx=ctx,
    )
    tiledb.Array.create(uri, schema, ctx=ctx)


def create_dataframe_array(
    uri, ctx: tiledb.Ctx, exemplar: pd.DataFrame, index_dims, *, mode="schema_only", sparse=True
):
    if os.path.exists(uri):
        raise Exception(f"Oops, {uri} already exists")
    offsets_filters = tiledb.FilterList([tiledb.PositiveDeltaFilter(), tiledb.ZstdFilter()])
    dim_filters = tiledb.FilterList([tiledb.ZstdFilter()])
    attr_filters = tiledb.FilterList([tiledb.ZstdFilter()])

    column_types, varlen_types = get_ctypes(exemplar)

    if sparse:
        tiledb.from_pandas(
            uri=uri,
            dataframe=exemplar,
            index_dims=index_dims,
            mode=mode,
            ctx=ctx,
            capacity=100000,
            offsets_filters=offsets_filters,
            attr_filters=attr_filters,
            dim_filters=dim_filters,
            sparse=True,
            allows_duplicates=False,
            column_types=column_types,
            varlen_types=varlen_types,
        )
    else:
        tiledb.from_pandas(
            uri=uri,
            dataframe=exemplar,
            mode=mode,
            ctx=ctx,
            capacity=100000,
            offsets_filters=offsets_filters,
            attr_filters=attr_filters,
            dim_filters=dim_filters,
            sparse=False,
            allows_duplicates=False,
            column_types=column_types,
            varlen_types=varlen_types,
        )


def create_empty_aggregation(uri: str, ctx: tiledb.Ctx, datasets: list):
    """
    Create the empty aggregation.
    """
    tiledb.group_create(uri, ctx=ctx)
    agg = tiledb.Group(uri, mode="w", ctx=ctx)

    exemplar = pd.DataFrame(
        index=pd.RangeIndex(0, 1, name="obs_id"),
        data={"obs_name": [""], "dataset_id": [""]} | {k: [""] for k in OBS_TERM_COLUMNS},
    )
    create_dataframe_array(f"{uri}/obs", ctx, exemplar, None, sparse=False)
    agg.add(uri=f"{uri}/obs", name="obs")

    exemplar = pd.DataFrame(
        index=pd.RangeIndex(0, 1, name="var_id"), data={"var_name": [""]} | {k: [""] for k in VAR_TERM_COLUMNS}
    )
    create_dataframe_array(f"{uri}/var", ctx, exemplar, ["var_id"], sparse=False)
    agg.add(uri=f"{uri}/var", name="var")

    create_single_value_X_array(f"{uri}/raw_X_normed", ctx)
    agg.add(uri=f"{uri}/raw_X_normed", name="raw_X_normed")

    create_single_value_X_array(f"{uri}/raw_X_ranked", ctx)
    agg.add(uri=f"{uri}/raw_X_ranked", name="raw_X_ranked")

    agg.close()

    return 0


def create(*, uri: str, manifest: io.TextIOBase, tdb_config: dict, current_schema_only: bool, verbose: bool, **other):
    datasets = [d for d in [d.strip() for d in manifest.readlines()] if d.endswith(".h5ad") and os.path.exists(d)]
    if len(datasets) == 0:
        print("No H5AD files in the manifest")
        return 1

    if os.path.exists(uri):
        print("Aggregation ALREADY exists")
        return 1

    ctx = tiledb.Ctx(tdb_config)

    if verbose:
        log("Creating empty aggregation", uri)
    create_empty_aggregation(uri, ctx, datasets)

    load_axes_dataframes(uri, datasets, ctx, current_schema_only, verbose)

    return 0
