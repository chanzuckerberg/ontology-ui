import sys
import os
import gzip
import json
import shutil
import tempfile
import requests
import datetime
from collections import deque, namedtuple
from functools import reduce
from concurrent.futures import ThreadPoolExecutor, as_completed

import tiledb
import owlready2
import yaml
import pandas as pd

from .common import OBS_TERM_COLUMNS

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
OWL_INFO_URI = (
    "https://raw.githubusercontent.com/chanzuckerberg/single-cell-curation/main"
    "/cellxgene_schema_cli/cellxgene_schema/ontology_files/owl_info.yml"
)

# attributes that link terms (relationships)
TERM_LINKS = ["parents", "part_of", "have_part", "develops_from", "derives_from"]

# Add additional seed terms that we _always_ want to include in our ontology, even if they
# are not present in the data.
SEED_ONTOLOGIES = ["CL", "HANCESTRO", "HsapDv", "MmusDv"]


# global names of interest
PART_OF = owlready2.IRIS["http://purl.obolibrary.org/obo/BFO_0000050"]
HAVE_PART = owlready2.IRIS["http://purl.obolibrary.org/obo/BFO_0000051"]
DERIVES_FROM = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0001000"]
DEVELOPS_FROM = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0002202"]
# IN_LATERAL_SIDE_OF = owlready2.IRIS["http://purl.obolibrary.org/obo/BSPO_0000126"]
# LOCATED_IN = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0001025"]
ONLY_IN_TAXON = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0002160"]
# CONTRIBUTES_TO_MORPHOLOGY_OF = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0002433"]
# IN_TAXON = owlready2.IRIS["http://purl.obolibrary.org/obo/RO_0002162"]
HOMO_SAPIENS = owlready2.IRIS["http://purl.obolibrary.org/obo/NCBITaxon_9606"]


def create_graph(
    *,
    uri: str,
    owl_info: str,
    rank_genes_groups: str,
    filter_non_human: bool,
    output,
    verbose: bool,
    tdb_config: dict,
    **other,
):
    global tiledb_ctx
    tiledb_ctx = tiledb.Ctx(tdb_config)

    global _verbose
    _verbose = verbose

    # Load the current cellxgene schema OWL configuration, which points
    # at all of the master ontology files.
    owl_info = fetch_yaml(owl_info)

    # Load the ranked genes
    with open(rank_genes_groups) as rgg:
        genes_rankings = json.load(rgg)

    # Load initial data
    with ThreadPoolExecutor() as tp:

        load_ontology = tp.submit(load_ontologies, owl_info)
        load_obs = tp.submit(load_obs_dataframe, uri)
        load_var = tp.submit(load_var_dataframe, uri)

        obs_df = load_obs.result()
        var_df = load_var.result()

        # identify terms in use by the dataset
        master_ontology = load_ontology.result()
        terms_directly_in_use, terms_in_use = get_terms_in_use(filter_non_human, master_ontology, obs_df)
        if output != sys.stdout:
            print(
                f"{len(terms_directly_in_use)} terms directly in use, "
                f"{len(terms_in_use)} total (including ancestral terms)."
            )

        # Create and save the portion of the ontologies in-use by the dataset
        in_use_ontologies = create_in_use_ontologies(master_ontology, terms_in_use)

        # annotate the in-use ontology with data attributes
        in_use_ontologies = annotate_ontology(in_use_ontologies, obs_df, var_df, genes_rankings)

        # filter empty/unused terms to make the graph smaller
        in_use_ontologies = cleanup_fields(in_use_ontologies)

    # Create & save the graph
    result = {
        "dataset": uri,
        "created_on": datetime.datetime.now().astimezone().isoformat(),
        "owl_info": {name: info["urls"][info["latest"]] for name, info in owl_info.items()},
        "ontologies": in_use_ontologies,
    }
    json.dump(result, output)


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


def annotate_ontology(in_use_ontologies: dict, obs_df: pd.DataFrame, var_df: pd.DataFrame, genes_rankings: dict):
    # Add stats & other annotations

    # Number of cells per term
    term_counts = get_term_counts(obs_df)
    for termId, count in term_counts.items():
        # ignore terms that didn't make it into our in-use list, eg "unknown", "na" and other extra-ontological
        # extensions define by the cellxgene schema
        ontology_name = termId.split(":")[0]
        if ontology_name in in_use_ontologies and termId in in_use_ontologies[ontology_name]:
            in_use_ontologies[ontology_name][termId]["n_cells"] = count

    # Links found in the data between cell_type and tissue_type are saved in 'part_of'
    grouped = (
        obs_df[["cell_type_ontology_term_id", "tissue_ontology_term_id"]]
        .groupby(by=["cell_type_ontology_term_id", "tissue_ontology_term_id"])
        .size()
    )
    for fromId in grouped.index.to_frame().to_dict(orient="series")["cell_type_ontology_term_id"].unique():
        ontology_name = fromId.split(":", 1)[0]
        if ontology_name != "CL":
            continue
        part_of = set(in_use_ontologies[ontology_name][fromId]["part_of"])
        part_of.update(list(filter(lambda id: id.startswith("UBERON:"), grouped[fromId].index)))
        in_use_ontologies[ontology_name][fromId]["part_of"] = list(part_of)

    # add genes of significance annotation based upon the gene groups rankings (derived from data)
    for ontology_name, column_name in [("CL", "cell_type_ontology_term_id"), ("UBERON", "tissue_ontology_term_id")]:
        if column_name not in genes_rankings:
            print("missing column name", column_name)
            continue
        for term_id in genes_rankings[column_name].keys():
            if term_id in in_use_ontologies[ontology_name]:
                in_use_ontologies[ontology_name][term_id]["genes"] = genes_rankings[column_name][term_id]["genes"]
            else:
                print("unknown term!", term_id)

    return in_use_ontologies


def cleanup_fields(in_use_ontologies):
    """Remove anything we don't want to end up in the JSON"""

    def filtered_term(term):
        del term["iri"]
        for k in ["synonyms"] + TERM_LINKS:
            term[k] = list(set(term[k]))

        for link in ["deprecated", "synonyms", "label"] + TERM_LINKS:
            if not term[link]:
                del term[link]

        return term

    return {
        ont_name: {term_id: filtered_term(term) for term_id, term in ontology.items()}
        for ont_name, ontology in in_use_ontologies.items()
    }


def is_non_human(term_id, term) -> bool:
    label = term["label"].lower()
    non_human = (
        label.endswith("(mus musculus)")
        or label.endswith("(sensu nematoda and protostomia)")
        or label.endswith("(sensu endopterygota)")
        or label.endswith("(sensu fungi)")
        or label.endswith("(sensu viridiplantae)")
        or label.endswith("(sensu endopterygota)")
        or label.endswith("(sensu arthropoda)")
        or label.endswith("(sensu arthopoda)")  # likely misspelling in CL, but it exists!
        or label.endswith("(sensu mus)")
        or label.endswith("(sensu nematoda)")
        or label.endswith("(sensu diptera)")
        or label.endswith("(sensu mycetozoa)")
        or "spore" in label
        or "sporocyte" in label
        or "conidium" in label
        or "fungal" in label
        or "fungi" in label
    )

    if not non_human:
        oc = owlready2.IRIS[term["iri"]]
        only_in_taxon = get_links(oc.is_a, ONLY_IN_TAXON)
        non_human = len(only_in_taxon) > 0 and HOMO_SAPIENS not in only_in_taxon

    return non_human


def get_seed_terms(filter_non_human: bool, master_ontology, ont_name):
    # return seed terms for the specified ontology. Filter as requested.
    if ont_name in ["CL", "UBERON"] and filter_non_human:
        return (k for k, v in master_ontology[ont_name].items() if not v["deprecated"] and not is_non_human(k, v))
    return master_ontology[ont_name].keys()


def get_terms_in_use(filter_non_human: bool, master_ontology, obs_df):
    # Seed with terms used by the dataset.
    terms_in_use = set()
    for col in OBS_TERM_COLUMNS:
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
    for ont_name in SEED_ONTOLOGIES:
        # terms_in_use.update(term_id for term_id in master_ontology[ont_name].keys())
        terms_in_use.update(get_seed_terms(filter_non_human, master_ontology, ont_name))

    # generate list of all referenced terms, including links, parents, etc.
    to_be_processed = deque(terms_in_use)
    while len(to_be_processed) > 0:
        term = to_be_processed.popleft()
        ontology_name = term.split(":")[0]
        for link in TERM_LINKS:
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
    for col in OBS_TERM_COLUMNS:
        counts = obs_df[col].value_counts()
        term_counts = reduce(merge_counts, counts.items(), term_counts)

    return term_counts


def fetch_json(url: str) -> dict:
    return json.loads(fetch(url))


def fetch_yaml(url: str):
    return yaml.safe_load(fetch(url))


def fetch(url):
    response = requests.get(url)
    if not response.ok:
        return None
    if response.headers["Content-Type"] == "application/octet-stream" or url.endswith(".gz"):
        content = gzip.decompress(response.content)
    else:
        content = response.content
    return content


def download(url):
    """
    Downloads to a temp file. If ends with .gz, decompresses.  File name returned.
    Caller must delete file when no longer needed.
    """
    if _verbose:
        print(f"Downloading {url}")
    is_gzipped = url.endswith(".gz")
    suffix = ".gz" if is_gzipped else None
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=suffix, mode="wb", delete=False) as f:
            for chunk in r.iter_content(chunk_size=512 * 1024):
                f.write(chunk)
            tmp_file_name = f.name

    if is_gzipped:
        gz_tmp_file_name = tmp_file_name
        with gzip.open(gz_tmp_file_name, "rb") as f_in:
            with tempfile.NamedTemporaryFile(mode="wb", delete=False) as f_out:
                shutil.copyfileobj(f_in, f_out, 512 * 1024)
                tmp_file_name = f_out.name
        os.unlink(gz_tmp_file_name)

    return tmp_file_name


def get_links(is_a, prop, whitelist=None):
    links = []
    for sc in is_a:
        if not isinstance(sc, owlready2.Restriction):
            continue
        if not sc.property == prop:
            continue

        if isinstance(sc.value, owlready2.ThingClass):
            term_id = sc.value.name.replace("_", ":")
            if whitelist is not None and term_id.split(":", maxsplit=1)[0] in whitelist:
                links.append(term_id)
        elif (
            isinstance(sc.value, owlready2.Not)
            or isinstance(sc.value, owlready2.LogicalClassConstruct)
            or isinstance(sc.value, owlready2.Restriction)
        ):
            # too complicated - punt!
            continue
        else:
            raise Exception(f"Unknown relation {sc}, {sc.value}")

    return links


def build_ontology(owl_info, onto_prefix, onto):
    onto_iri = onto.base_iri
    if onto_iri.endswith("#"):
        onto_iri = onto_iri[0:-1]
    if _verbose:
        print(f"Building {onto_prefix}")

    # by default, whitelist a link to any ontology we are incorporating. Update
    # this list with manual overrides as helpful.
    # LINK_WHITELIST = {"CL": ["CL", "UBERON"]}
    LINK_WHITELIST = {onto_name: list(owl_info.keys()) for onto_name in owl_info.keys()}

    ontology = {}
    iri_onto_prefix = f"{onto_prefix}_"
    whitelist = LINK_WHITELIST.get(onto_prefix, [onto_prefix])
    for onto_class in onto.classes():
        name = onto_class.name

        # Skip terms that are not direct children from this ontology
        if not name.startswith(iri_onto_prefix):
            continue

        try:
            term_id = name.replace("_", ":", 1)
            term = {}
            term["iri"] = onto_class.iri
            term["label"] = onto_class.label[0] if len(onto_class.label) > 0 else ""
            term["deprecated"] = True if onto_class.deprecated and onto_class.deprecated.first() else False
            term["parents"] = [
                p.name.replace("_", ":") for p in onto_class.__bases__ if p.name.startswith(iri_onto_prefix)
            ]
            term["synonyms"] = getattr(onto_class, "hasExactSynonym", [])
            term["part_of"] = get_links(onto_class.is_a, PART_OF, whitelist)
            term["have_part"] = get_links(onto_class.is_a, HAVE_PART, whitelist)
            term["derives_from"] = get_links(onto_class.is_a, DERIVES_FROM, whitelist)
            term["develops_from"] = get_links(onto_class.is_a, DEVELOPS_FROM, whitelist)

            ontology[term_id] = term

        except Exception as e:
            print(f"Error handling {name}: {e}")
            raise e

    return ontology


def load_ontologies(owl_info):
    ontologies = {}
    with ThreadPoolExecutor() as tp:
        download_futures = {
            tp.submit(download, info["urls"][info["latest"]]): prefix for prefix, info in owl_info.items()
        }

        for future in as_completed(download_futures):
            # unfortunately, can't parallelize owlready2 interactions
            onto_prefix = download_futures[future]
            fname = future.result()
            if _verbose:
                print(f"Loading {onto_prefix}")
            onto = owlready2.get_ontology(fname).load()
            os.unlink(fname)
            ontologies[onto_prefix] = build_ontology(owl_info, onto_prefix, onto)

    return ontologies


def load_obs_dataframe(uri: str):
    global tiledb_ctx
    with tiledb.open(f"{uri}/obs", ctx=tiledb_ctx) as obs:
        # split col into dims and attrs as required by tiledb query API
        dim_names = set(d.name for d in obs.schema.domain)
        dims = [c for c in OBS_TERM_COLUMNS if c in dim_names]
        attrs = [c for c in OBS_TERM_COLUMNS if c not in dim_names]
        obs_df = obs.query(dims=dims, attrs=attrs).df[:]

        # stringify
        for i in range(obs.schema.nattr):
            attr = obs.attr(i)
            name = attr.name
            if attr.dtype == "bytes" and attr.isvar is True and name in obs_df.keys():
                obs_df[name] = obs_df[name].str.decode("utf-8")

    """
    The tissue_ontology_term_id and the assay_ontology_term_id columns may contain auxillary information
    encoded in a term suffix, eg, "CL:0000000 (foobar)". For more detail see:
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#tissue_ontology_term_id
    and
    https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md#assay_ontology_term_id

    This code removes the extra suffix annotation from _all_ term columns.
    """
    pat = r"(?P<term>^.+:\S+)(?:\s\(.*\))?$"
    for col in OBS_TERM_COLUMNS:
        obs_df[col] = obs_df[col].str.replace(pat, lambda m: m.group("term"), regex=True)

    return obs_df


def load_var_dataframe(uri: str):
    global tiledb_ctx
    with tiledb.open(f"{uri}/var", ctx=tiledb_ctx) as var:
        var_df = var.df[:]
    return var_df
