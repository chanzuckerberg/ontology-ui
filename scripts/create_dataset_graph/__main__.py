import sys
import os
import argparse

import tiledb
import psutil

from .create import create
from .add import add_h5ad
from .rank import rank_cells, rank_genes_groups
from .consolidate import consolidate
from .graph import OWL_INFO_URI, create_graph


def main():
    parser = create_args_parser()
    args = parser.parse_args()
    if "func" not in args:
        print("Error: unknown sub-command.")
        parser.print_help()
        return 1

    try:
        tdb_config = create_tiledb_config(args)
        return args.func(args, tdb_config)
    except Exception as e:
        print("Error", e)
        return 1


def create_tiledb_config(args: argparse.ArgumentParser) -> dict:
    requested_tile_cache_size = int(args.tile_cache_fraction * psutil.virtual_memory().total) >> 20 << 20
    tile_cache_size = max(10 * 1024 ** 2, requested_tile_cache_size)
    return {
        "vfs.s3.region": os.environ.get("AWS_DEFAULT_REGION", "us-west-2"),
        "py.init_buffer_bytes": 4 * 1024 ** 3,  # per-column buffer size
        "sm.tile_cache_size": tile_cache_size,
        "sm.consolidation.buffer_size": 4 * 1024 ** 3,  # consolidation attribute buffer size
    }


def create_args_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("uri", type=str, help="Group URI")
    parser.add_argument("-v", "--verbose", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument(
        "--tile-cache-fraction",
        type=float_range(0.0, 1.0),
        default=0.1,
        help=argparse.SUPPRESS,
    )
    subparsers = parser.add_subparsers()

    sp = subparsers.add_parser("create", help="Create empty aggregation.")
    sp.set_defaults(func=lambda args, tdb_config: create(args.uri, tdb_config))

    sp = subparsers.add_parser("add", help="Add a H5AD to the aggregation")
    sp.add_argument("h5ad", type=str, help="H5AD URI")
    sp.add_argument("--dataset-id", type=str, help="Set dataset ID, to make unique obs_ids")
    sp.add_argument(
        "--current-schema-only",
        action=argparse.BooleanOptionalAction,
        help="Ignore any data not encoded with current (2.0.0) schema",
        default=True,
    )
    sp.set_defaults(func=lambda args, tdb_config: add_h5ad(**vars(args), tdb_config=tdb_config))

    sp = subparsers.add_parser("rank-cells", help="Rank all cells in the consolidation.")
    sp.set_defaults(func=lambda args, tdb_config: rank_cells(**vars(args), tdb_config=tdb_config))

    sp = subparsers.add_parser("consolidate", help="Consolidate aggregation")
    sp.add_argument("--obs", action=argparse.BooleanOptionalAction, default=True, help="consolidate obs")
    sp.add_argument("--var", action=argparse.BooleanOptionalAction, default=True, help="consolidate var")
    sp.add_argument("--raw-X-normed", action=argparse.BooleanOptionalAction, default=False, help="consolidate X-normed")
    sp.add_argument("--raw-X-ranked", action=argparse.BooleanOptionalAction, default=False, help="consolidate X-ranked")
    sp.set_defaults(func=lambda args, tdb_config: consolidate(**vars(args), tdb_config=tdb_config))

    sp = subparsers.add_parser("rank-genes-groups", help="Consolidate aggregation")
    sp.add_argument("--groupby", type=str, action="append", help="obs key to group by")
    sp.add_argument("-n", "--top-n", type=int, help="Return top N genes per label (default: 20)", default=20)
    sp.add_argument(
        "--output",
        "-o",
        type=argparse.FileType("w"),
        default=sys.stdout,
        metavar="PATH",
        help="Output file (default: standard output)",
    )
    sp.set_defaults(func=lambda args, tdb_config: rank_genes_groups(**vars(args), tdb_config=tdb_config))

    sp = subparsers.add_parser("create-graph", help="Create dataset graph")
    sp.add_argument("--owl-info", type=str, help="cellxgene schema owl_info.yml URI", default=OWL_INFO_URI)
    sp.add_argument("--rank-genes-groups", type=str, help="rank genes info JSON URI", required=True)
    sp.add_argument(
        "--filter-non-human",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Remove (do not include) unreferenced non-human terms",
    )
    sp.add_argument("-o", "--output", type=argparse.FileType("w"), default=sys.stdout)
    sp.set_defaults(func=lambda args, tdb_config: create_graph(**vars(args), tdb_config=tdb_config))

    return parser


# Credit: https://stackoverflow.com/a/64259328
def float_range(mini, maxi):
    """
    Return function handle of an argument type function for
    ArgumentParser checking a float range: mini <= arg <= maxi
      mini - minimum acceptable argument
      maxi - maximum acceptable argument
    """

    # Define the function with default arguments
    def float_range_checker(arg):
        """New Type function for argparse - a float within predefined range."""

        try:
            f = float(arg)
        except ValueError:
            raise argparse.ArgumentTypeError("must be a floating point number")
        if f < mini or f > maxi:
            raise argparse.ArgumentTypeError("must be in range [" + str(mini) + " .. " + str(maxi) + "]")
        return f

    # Return function handle to checking function
    return float_range_checker


sys.exit(main())
