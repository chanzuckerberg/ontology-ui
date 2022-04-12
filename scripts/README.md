# Scripts used for development and deployment

## Getting started

To run the scripts, you will need Python 3.8 or later, then from the repo route:

1. Create a Python virtual environment, eg, `python3 -m venv ./venv`
2. Activate the venv, eg, `source venv/bin/activate`
3. Pip install requiremnts, eg, `pip install -r scripts/requirements.txt`

## Generating a dataset graph

The current development app is hard-wired to load /dataset_graph.json (eg, public/dataset_graph.json).
To generate that file for any given dataset (CXG or TileDB consolidated array):

> $ python scripts/create*dataset_graph.py *DATASET_URI\* -o public/dataset_graph.json

For example, for the full cellxgene atlas as of late March 2022:

> python scripts/create_dataset_graph.py s3://czi.share-tiledb/concatenated_corpus/ -o public/dataset_graph.json

Or, for a CXG in the dev bucket:

> python scripts/create_dataset_graph.py s3://hosted-cellxgene-dev/fbf96dda-33f8-4b35-ae6b-9973e7413116.cxg/ -o public/dataset_graph.json
