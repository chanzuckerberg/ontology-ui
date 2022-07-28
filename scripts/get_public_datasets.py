import sys
import gzip
import json
import argparse
import requests


"""
Queries the cellxgene public REST API for dataset, outputting a list of
H5ADs in a ready-to-execute format.

https://public-backend.production.single-cell.czi.technology/

Keep in mind: a dataset_id is durable, but may point to a different asset id over time.
The S3 URIs have the actual asset, but we rename/alias everything to the durable dataset_id.
"""


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers()

    sp = subparsers.add_parser("s3-uris", help="print list of s3 URIs")
    sp.set_defaults(func=print_s3_uris)

    sp = subparsers.add_parser("asset-paths", help="print list of asset paths")
    sp.set_defaults(func=print_asset_paths)

    sp = subparsers.add_parser("aws-cp-commands", help="print list of s3 cp commands")
    sp.add_argument("--base-path", type=str, help="Base file path to sync to (default: ./", default="./")
    sp.add_argument(
        "--dryrun", action=argparse.BooleanOptionalAction, help="append --dryrun to s3 sync command", default=False
    )
    sp.set_defaults(func=print_aws_cp_commands)

    args = parser.parse_args()

    if "func" not in args:
        print("Error: unknown sub-command.")
        parser.print_help()
        return 1

    datasets_index = fetch_json("https://public-backend.production.single-cell.czi.technology/dp/v1/datasets/index")
    public_primary_datasets_id = [
        dataset["id"]
        for dataset in datasets_index
        if dataset["is_primary_data"] != "SECONDARY"  # we want PRIMARY and BOTH (blended) datasets
    ]
    return args.func(args, get_datasets_asset_info(public_primary_datasets_id, filetype="H5AD"))


def print_s3_uris(_args, assets_info):
    for id, asset_info in assets_info:
        print(asset_info["s3_uri"], flush=True)
    return 0


def print_asset_paths(args, assets_info):
    for id, asset_info in assets_info:
        print(f"{id}/{asset_info['filename']}", flush=True)


def print_aws_cp_commands(args, assets_info):
    base_path = args.base_path
    if base_path[-1] != "/":
        base_path += "/"
    for id, asset_info in assets_info:
        s3_uri = asset_info["s3_uri"]
        filename = asset_info["filename"]
        cmd = f"aws s3 cp {s3_uri} {args.base_path}{id}/{filename}"
        if args.dryrun:
            cmd += " --dryrun"
        print(cmd, flush=True)

    return 0


def get_datasets_asset_info(ids, filetype):
    for id in ids:
        for asset_info in get_asset_info(id, filetype):
            yield (id, asset_info)


def fetch_json(url: str) -> dict:
    return json.loads(fetch(url))


def fetch(url):
    response = requests.get(url)
    if not response.ok:
        return None
    if response.headers["Content-Type"] == "application/octet-stream" or url.endswith(".gz"):
        content = gzip.decompress(response.content)
    else:
        content = response.content
    return content


def get_asset_info(id, filetype):
    assets = fetch_json(f"https://public-backend.production.single-cell.czi.technology/dp/v1/datasets/{id}/assets")
    return filter(lambda a: a["dataset"]["tombstone"] is False and a["filetype"] == filetype, assets["assets"])


if __name__ == "__main__":
    sys.exit(main())
