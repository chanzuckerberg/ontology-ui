import io
from datetime import datetime
import csv
from collections import namedtuple

import pandas as pd

# columns we preserve in our mini-atlas, on the assumption all data comes
# from cellxgene corpus.  Schema:
# https://github.com/chanzuckerberg/single-cell-curation/blob/main/schema/2.0.0/schema.md
OBS_TERM_COLUMNS = [
    "assay_ontology_term_id",
    "cell_type_ontology_term_id",
    "development_stage_ontology_term_id",
    "disease_ontology_term_id",
    "ethnicity_ontology_term_id",
    "organism_ontology_term_id",
    "sex_ontology_term_id",
    "tissue_ontology_term_id",
]

VAR_TERM_COLUMNS = []


def get_ctypes(df: pd.DataFrame):
    column_types = {}
    varlen_types = set()
    for k in df:
        base_dtype = df[k].dtype
        if pd.api.types.is_categorical_dtype(base_dtype):
            base_dtype = df[k].cat.categories.dtype

        if pd.api.types.is_object_dtype(base_dtype):
            base_dtype = str

        # for now, store all strings as ascii
        if base_dtype == str:
            base_dtype = bytes

        if df[k].dtype != base_dtype:
            column_types[k] = base_dtype
            if base_dtype == str or base_dtype == bytes:
                varlen_types.add(k)

    return column_types, varlen_types


def chunker(listlike, chunk_size):
    for i in range(0, len(listlike), chunk_size):
        yield listlike[i : i + chunk_size]


def log(*args):
    print(f"[{datetime.now()}]", *args)


def parse_manifest(manifest: io.TextIOBase):
    """
    return manifest as list of tuples, (dataset_id, path)
    """
    Dataset = namedtuple("Dataset", ["dataset_id", "path"])
    manifest_reader = csv.reader(manifest)
    return [Dataset(*[c.strip() for c in r]) for r in manifest_reader]
