import tiledb

from .common import log


def consolidate(
    *,
    uri: str,
    tdb_config: dict,
    obs: bool,
    var: bool,
    raw_X_normed: bool,
    raw_X_ranked: bool,
    verbose: bool = False,
    **other,
):
    ctx = tiledb.Ctx(tdb_config)

    if obs:
        if verbose:
            log("Consolidating obs...")
        tiledb.consolidate(f"{uri}/obs", ctx=ctx)
        tiledb.vacuum(f"{uri}/obs", ctx=ctx)

    if var:
        if verbose:
            log("Consolidating var...")
        tiledb.consolidate(f"{uri}/var", ctx=ctx)
        tiledb.vacuum(f"{uri}/var", ctx=ctx)

    if raw_X_normed:
        if verbose:
            log("Consolidating raw_X_normed...")
        tiledb.consolidate(f"{uri}/raw_X_normed", ctx=ctx)
        tiledb.vacuum(f"{uri}/raw_X_normed", ctx=ctx)

    if raw_X_ranked:
        if verbose:
            log("Consolidating raw_X_ranked...")
        tiledb.consolidate(f"{uri}/raw_X_ranked", ctx=ctx)
        tiledb.vacuum(f"{uri}/raw_X_ranked", ctx=ctx)

    return 0
