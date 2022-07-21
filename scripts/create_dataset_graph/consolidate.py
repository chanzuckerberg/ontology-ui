import tiledb


def consolidate(
    *,
    uri: str,
    ctx: tiledb.Ctx,
    obs: bool,
    var: bool,
    raw_X_normed: bool,
    raw_X_ranked: bool,
    verbose: bool = False,
    **other,
):
    if obs:
        if verbose:
            print("Consolidating obs...")
        tiledb.consolidate(f"{uri}/obs", ctx=ctx)
        tiledb.vacuum(f"{uri}/obs", ctx=ctx)

    if var:
        if verbose:
            print("Consolidating var...")
        tiledb.consolidate(f"{uri}/var", ctx=ctx)
        tiledb.vacuum(f"{uri}/var", ctx=ctx)

    if raw_X_normed:
        if verbose:
            print("Consolidating raw_X_normed...")
        tiledb.consolidate(f"{uri}/raw_X_normed", ctx=ctx)
        tiledb.vacuum(f"{uri}/raw_X_normed", ctx=ctx)

    if raw_X_ranked:
        if verbose:
            print("Consolidating raw_X_ranked...")
        tiledb.consolidate(f"{uri}/raw_X_ranked", ctx=ctx)
        tiledb.vacuum(f"{uri}/raw_X_ranked", ctx=ctx)

    return 0
