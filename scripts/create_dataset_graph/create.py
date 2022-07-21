import os.path

import tiledb
import numpy as np
import pandas as pd

from .common import OBS_TERM_COLUMNS, VAR_TERM_COLUMNS, get_ctypes


def create_single_value_X_array(uri: str, ctx: tiledb.Ctx):
    if os.path.exists(uri):
        raise Exception(f"Oops, {uri} already exists")

    dom = tiledb.Domain(
        tiledb.Dim(name="var_id", domain=(None, None), dtype="ascii", filters=[tiledb.ZstdFilter()]),
        ctx=ctx,
    )
    attrs = (
        tiledb.Attr(name="obs_id", dtype=np.dtype(np.str_), filters=[tiledb.ZstdFilter()], ctx=ctx),
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
            sparse=sparse,
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
            sparse=sparse,
            allows_duplicates=False,
            column_types=column_types,
            varlen_types=varlen_types,
        )


def create(uri: str, ctx: tiledb.Ctx):
    """
    Create the empty aggregation.
    """
    if os.path.exists(uri):
        print("Aggregation ALREADY exists")
        return 1

    tiledb.group_create(uri, ctx=ctx)
    agg = tiledb.Group(uri, mode="w", ctx=ctx)

    exemplar = pd.DataFrame(
        index=pd.Index(data=["a"], name="obs_id"),
        # data={"dataset_id": ["b"]} | {k: [""] for k in OBS_TERM_COLUMNS},
        data={k: [""] for k in OBS_TERM_COLUMNS},
    )
    create_dataframe_array(f"{uri}/obs", ctx, exemplar, ["obs_id"], sparse=True)
    agg.add(uri=f"{uri}/obs", name="obs")

    exemplar = pd.DataFrame(index=pd.Index(data=["a"], name="var_id"), data={k: [""] for k in VAR_TERM_COLUMNS})
    create_dataframe_array(f"{uri}/var", ctx, exemplar, ["var_id"], sparse=True)
    agg.add(uri=f"{uri}/var", name="var")

    create_single_value_X_array(f"{uri}/raw_X_normed", ctx)
    agg.add(uri=f"{uri}/raw_X_normed", name="raw_X_normed")

    create_single_value_X_array(f"{uri}/raw_X_ranked", ctx)
    agg.add(uri=f"{uri}/raw_X_ranked", name="raw_X_ranked")

    agg.close()

    return 0
