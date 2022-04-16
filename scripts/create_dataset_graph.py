import sys
import os
import gzip
import json
import requests
from argparse import ArgumentParser, ArgumentTypeError
import argparse
import datetime
from collections import deque
from functools import reduce
from concurrent.futures import ThreadPoolExecutor

import tiledb
import numpy as np
import pandas as pd
import psutil

"""
Given reference ontologies (CL, UBERON, etc) and a baseline dataset,
generate an annotated ontology graph for the `ontology-ui`.

The graph contains:
    * all terms used in the dataset
    * all terms from CL, HANCESTRO, HsapDv and MmusDv
    * and all terms reachable from those initial seed terms
Reachable (links) is defined as:
    * a term's ancestors
    * any terms that the "Lattice" cross-reference links to

In addition, the graph will be annotated with:
    * term ID, label/name and ancestor
    * synonyms from the Lattice graph
    * dataset stats, including:
        * number of cells in the dataset labelled with the term

The cellxgene schema 2.0.0 defines conventions regarding which label categories
are in use, and various extra-ontology annotations specific to CXG (eg, the
"na" term).  Per the 2.0.0 schema, we look for terms in the following columns of
the dataset:
* assay_ontology_term_id
* cell_type_ontology_term_id
* development_stage_ontology_term_id
* disease_ontology_term_id
* ethnicity_ontology_term_id
* organism_ontology_term_id
* sex_ontology_term_id
* tissue_ontology_term_id

The code does NOT enforce or validate use of terms, ie, the dataset is presumed
compliant with the 2.0.0 schema.
"""

# Default locators
ALL_ONTOLOGIES_URL_DEFAULT = (
    "https://raw.githubusercontent.com/chanzuckerberg/single-cell-curation/main"
    "/cellxgene_schema_cli/cellxgene_schema/ontology_files/all_ontology.json.gz"
)
LATTICE_ONTOLOGY_URL_DEFAULT = "https://latticed-build.s3.us-west-2.amazonaws.com/ontology/ontology-2022-02-04.json"

# Columns that contain terms in the CXG
CXG_TERM_COLUMNS = [
    "assay_ontology_term_id",
    "cell_type_ontology_term_id",
    "development_stage_ontology_term_id",
    "disease_ontology_term_id",
    "ethnicity_ontology_term_id",
    "organism_ontology_term_id",
    "sex_ontology_term_id",
    "tissue_ontology_term_id",
]


def main():
    global tiledb_ctx
    global cxg_mode

    parser = create_args_parser()
    args = parser.parse_args()
    cxg_mode = args.uri.endswith(".cxg") or args.uri.endswith(".cxg/")
    tiledb_ctx = create_tiledb_ctx(args)

    # Load initial data
    with ThreadPoolExecutor() as tp:
        load_ontology = tp.submit(make_master_ontology, args)
        load_obs = tp.submit(load_obs_dataframe, args)
        load_var = tp.submit(load_var_dataframe, args)

        obs_df = load_obs.result()
        var_df = load_var.result()

        # identify terms in use by the dataset
        master_ontology = load_ontology.result()
        terms_directly_in_use, terms_in_use = get_terms_in_use(master_ontology, obs_df)
        if args.output != sys.stdout:
            print(
                f"{len(terms_directly_in_use)} terms directly in use, "
                f"{len(terms_in_use)} total (including ancestral terms)."
            )

        # Create and save the portion of the ontologies in-use by the dataset
        in_use_ontologies = create_in_use_ontologies(master_ontology, terms_in_use)

        # annotate the in-use ontology with data attributes
        in_use_ontologies = annotate_ontology(in_use_ontologies, obs_df, var_df)

    # Create & save the graph
    result = {
        "dataset": args.uri,
        "created_on": datetime.datetime.now().astimezone().isoformat(),
        "master_ontology_uri": args.all_ontologies_uri,
        "lattice_uri": args.lattice_uri,
        "ontologies": in_use_ontologies,
    }
    json.dump(result, args.output)


def create_in_use_ontologies(master_ontology, terms_in_use):
    in_use_ontologies = {
        ont_name: {
            term_id: term.copy()  # we will add info to term, so don't pollute master_ontology
            for term_id, term in ontology.items()
            if term_id in terms_in_use
        }
        for ont_name, ontology in master_ontology.items()
    }
    return in_use_ontologies


def annotate_ontology(in_use_ontologies, obs_df, var_df):
    # Add stats & other annotation

    # Number of cells per term
    term_counts = get_term_counts(obs_df)
    for termId, count in term_counts.items():
        # ignore terms that didn't make it into our in-use list, eg "unknown", "na" and other extra-ontological
        # extensions define by the cellxgene schema
        ontology_name = termId.split(":")[0]
        if ontology_name in in_use_ontologies and termId in in_use_ontologies[ontology_name]:
            in_use_ontologies[ontology_name][termId]["n_cells"] = count

    return in_use_ontologies


def get_terms_in_use(master_ontology, obs_df):
    # Seed with terms used by the dataset.
    terms_in_use = set()
    for col in obs_df:
        terms_in_use.update(obs_df[col].unique())

    # Silently remove known unknowns
    #
    # TODO: this is likely an ever-growing list, as there are similar proposals to
    # handle other conditions in a similar manner (eg, set cell_type_ontology_term_id to "doublet").
    # Perhaps a better filter would be to remove anything that is clearly not an ontology term,
    # as signified by an unknown or missing prefix.
    #
    # UPDATE: Talked to Jason & his view is that anything not matching ONT:XXXXXX can be
    # treated as an extension term and ignored.
    TERMS_TO_IGNORE = ["", "na", "unknown"]
    for term in TERMS_TO_IGNORE:
        terms_in_use.discard(term)

    # Remove and warn about unknown unknowns
    all_legal_terms = set(term_id for ont in master_ontology.values() for term_id in ont.keys())
    unknown_terms = terms_in_use - all_legal_terms
    if unknown_terms:
        print("WARNING: dataset contains UNKNOWN ontology terms:")
        print(unknown_terms)
    terms_in_use -= unknown_terms

    # save terms directly referenced by dataset
    terms_directly_in_use = terms_in_use.copy()

    # Add additional seed terms that we _always_ want to include
    # in our ontology, even if they are not present in the data.
    for ont_name in ["CL", "HANCESTRO", "HsapDv", "MmusDv"]:
        terms_in_use.update(term_id for term_id in master_ontology[ont_name].keys())

    # generate list of all referenced terms, including xrefs, ancestors, etc.
    to_be_processed = deque(terms_in_use)
    while len(to_be_processed) > 0:
        term = to_be_processed.popleft()
        ontology_name = term.split(":")[0]
        for link in ["ancestors", "xref"]:
            linked_terms = master_ontology[ontology_name][term][link]
            unprocessed = set(linked_terms) - terms_in_use
            to_be_processed.extend(unprocessed)
            terms_in_use.update(unprocessed)

    return terms_directly_in_use, terms_in_use


def get_term_counts(obs_df: pd.DataFrame) -> dict:
    """
    Return a dictionary of terms:counts, where counts is the
    number of cells with that label/
    """

    def merge_counts(acc, val):
        term, count = val
        acc[term] = acc.get(term, 0) + count
        return acc

    term_counts = {}
    for col in CXG_TERM_COLUMNS:
        counts = obs_df[col].value_counts()
        term_counts = reduce(merge_counts, counts.items(), term_counts)

    return term_counts


def make_master_ontology(args):
    all_ontologies = fetchJson(args.all_ontologies_uri)
    lattice = fetchJson(args.lattice_uri)
    all_terms = set(term_id for ont in all_ontologies.values() for term_id in ont.keys())

    # Consolidated ontologies with xref from lattice
    for _, ont in all_ontologies.items():
        for id, node in ont.items():
            if id in lattice:
                # Prune xrefs already in the ancestor list.
                xref = set(lattice[id].get("ancestors", [])) - set(node["ancestors"])
                # Prune terms not in our ontologies (this can happen if Lattice was built
                # on a more recent version of the ontology).
                xref &= all_terms
                node["xref"] = list(xref)
                # de-dup, as Lattice occasionally has duplicate terms
                node["synonyms"] = list(set(lattice[id].get("synonyms", [])))
            else:
                node["xref"] = []
                node["synonyms"] = []

    return all_ontologies


def fetchJson(url: str) -> dict:
    response = requests.get(url)
    if not response.ok:
        return None
    if response.headers["Content-Type"] == "application/octet-stream" or url.endswith(".gz"):
        return json.loads(gzip.decompress(response.content))
    return response.json()


def load_obs_dataframe(args):
    global tiledb_ctx
    with tiledb.open(f"{args.uri}/obs", ctx=tiledb_ctx) as obs:
        # split col into dims and attrs as required by tiledb query API
        dim_names = set(d.name for d in obs.schema.domain)
        obs_df = obs.query(
            dims=[c for c in CXG_TERM_COLUMNS if c in dim_names],
            attrs=[c for c in CXG_TERM_COLUMNS if c not in dim_names],
        ).df[:]

    # sort by obs_idx if not in cxg_mode
    if not cxg_mode:
        obs_df = obs_df.sort_values(by=["obs_idx"], ignore_index=True)
        assert np.all(obs_df.index == obs_df["obs_idx"])

    """
    The tissue_ontology_term_id and the assay_ontology_term_id columns may contain auxillary information
    encoded in a term suffix, eg, "CL:0000000 (foobar)". For more detail see:
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#tissue_ontology_term_id
    and
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#assay_ontology_term_id

    This code removes the extra suffix annotation from _all_ term columns.
    """
    pat = r"(?P<term>^.+:\S+)(?:\s\(.*\))?$"
    for col in obs_df:
        obs_df[col] = obs_df[col].str.replace(pat, lambda m: m.group("term"), regex=True)

    return obs_df


def load_var_dataframe(args):
    global tiledb_ctx
    with tiledb.open(f"{args.uri}/var", ctx=tiledb_ctx) as var:
        var_df = var.df[:]
        if not cxg_mode:
            var_df = var_df.sort_values(by=["var_idx"], ignore_index=True)
            assert np.all(var_df.index == var_df["var_idx"])
    return var_df


def create_tiledb_ctx(args: ArgumentParser) -> tiledb.Ctx:
    requested_tile_cache_size = int(args.tile_cache_fraction * psutil.virtual_memory().total) >> 20 << 20
    tile_cache_size = max(10 * 1024**2, requested_tile_cache_size)
    ctx = tiledb.Ctx(
        {
            "vfs.s3.region": os.environ.get("AWS_DEFAULT_REGION", "us-west-2"),
            "py.init_buffer_bytes": 128 * 1024**2,  # per-column buffer size
            "sm.tile_cache_size": tile_cache_size,
        }
    )
    return ctx


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
            raise ArgumentTypeError("must be a floating point number")
        if f < mini or f > maxi:
            raise ArgumentTypeError("must be in range [" + str(mini) + " .. " + str(maxi) + "]")
        return f

    # Return function handle to checking function
    return float_range_checker


def create_args_parser() -> ArgumentParser:
    parser = ArgumentParser()
    parser.add_argument("uri", type=str, help="Dataset URI")
    parser.add_argument(
        "--all-ontologies-uri",
        type=str,
        help="all_ontologies URI - location of all_ontologies file for cellxgene schema",
        default=ALL_ONTOLOGIES_URL_DEFAULT,
    )
    parser.add_argument(
        "--lattice-uri",
        type=str,
        help="lattice URI - location of Lattice term cross-reference",
        default=LATTICE_ONTOLOGY_URL_DEFAULT,
    )
    parser.add_argument("-o", "--output", type=argparse.FileType("w"), default=sys.stdout)
    parser.add_argument(
        "--tile-cache-fraction",
        type=float_range(0.0, 1.0),
        default=0.33,
        help=argparse.SUPPRESS,
    )
    return parser


if __name__ == "__main__":
    sys.exit(main())
