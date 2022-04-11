import sys
import os
import gzip
import json
import requests
import argparse
import datetime
from collections import deque
from functools import reduce

import tiledb
import pandas as pd

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
ALL_ONTOLOGIES_URL_DEFAULT = "https://raw.githubusercontent.com/chanzuckerberg/single-cell-curation/main/cellxgene_schema_cli/cellxgene_schema/ontology_files/all_ontology.json.gz"
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
    parser = argparse.ArgumentParser()
    parser.add_argument("cxg", type=str, help="CXG base URI")
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
    parser.add_argument(
        "-o", "--output", type=argparse.FileType("w"), default=sys.stdout
    )
    args = parser.parse_args()

    master_ontology = make_master_ontology(args)
    obs_df = load_obs_dataframe(args)
    terms_directly_in_use, terms_in_use = get_terms_in_use(master_ontology, obs_df)

    if args.output != sys.stdout:
        print(
            f"{len(terms_directly_in_use)} terms directly in use, {len(terms_in_use)} total (including ancestral terms)."
        )

    in_use_ontologies = create_in_use_ontologies(master_ontology, terms_in_use, obs_df)

    result = {
        "dataset": args.cxg,
        "created_on": datetime.datetime.now().astimezone().isoformat(),
        "master_ontology_uri": args.all_ontologies_uri,
        "lattice_uri": args.lattice_uri,
        "ontologies": in_use_ontologies,
    }
    json.dump(result, args.output)


def create_in_use_ontologies(master_ontology, terms_in_use, obs_df):
    in_use_ontologies = {
        ont_name: {
            term_id: term.copy()  # we will add info to term, so don't pollute master_ontology
            for term_id, term in ontology.items()
            if term_id in terms_in_use
        }
        for ont_name, ontology in master_ontology.items()
    }

    # Add stats & other annotation
    term_counts = get_term_counts(obs_df)
    for termId, count in term_counts.items():
        # ignore terms that didn't make it into our in-use list, eg
        # "unknown", "na" and other extra-ontological extensions
        # define by the cellxgene schema
        ontology_name = termId.split(":")[0]
        if (
            ontology_name in in_use_ontologies
            and termId in in_use_ontologies[ontology_name]
        ):
            in_use_ontologies[ontology_name][termId]["n_cells"] = count

    return in_use_ontologies


def get_terms_in_use(master_ontology, obs_df):
    # Seed with terms used by the dataset.
    terms_in_use = set()
    for col in obs_df:
        terms_in_use.update(obs_df[col].unique())

    # Silently remove known unknowns
    terms_in_use.discard("")
    terms_in_use.discard("na")
    terms_in_use.discard("unknown")

    # Remove and warn about unknown unknowns
    all_legal_terms = set(
        term_id for ont in master_ontology.values() for term_id in ont.keys()
    )
    unknown_terms = terms_in_use - all_legal_terms
    if unknown_terms:
        print("WARNING: dataset contains unknown ontology terms:")
        print(unknown_terms)
    terms_in_use -= unknown_terms

    # save terms directly referenced by dataset
    terms_directly_in_use = terms_in_use.copy()

    # Add additional seed terms that we _always_ want to include
    # in our ontology
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
    all_terms = set(
        term_id for ont in all_ontologies.values() for term_id in ont.keys()
    )

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
    if response.headers["Content-Type"] == "application/octet-stream" or url.endswith(
        ".gz"
    ):
        return json.loads(gzip.decompress(response.content))
    return response.json()


def load_obs_dataframe(args):
    with tiledb.open(
        f"{args.cxg}/obs",
        "r",
        config={"vfs.s3.region": os.environ.get("AWS_DEFAULT_REGION", "us-west-2")},
    ) as arr:
        # split col into dims and attrs as required by tiledb query API
        dim_names = set(d.name for d in arr.schema.domain)
        obs = arr.query(
            dims=[c for c in CXG_TERM_COLUMNS if c in dim_names],
            attrs=[c for c in CXG_TERM_COLUMNS if c not in dim_names],
        ).df[:]

    """
    The tissue_ontology_term_id and the assay_ontology_term_id columns may contain auxilliary information
    encoded in a term suffix, eg, "CL:0000000 (foobar)". For more detail see:
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#tissue_ontology_term_id
    and
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#assay_ontology_term_id

    This code removes the extra annotation from _all_ term columns.
    """
    pat = r"(?P<term>^.+:\S+)(?:\s\(.*\))?$"
    repl = lambda m: m.group("term")
    for col in obs:
        obs[col] = obs[col].str.replace(pat, repl, regex=True)

    return obs


if __name__ == "__main__":
    sys.exit(main())
