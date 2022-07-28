# Scripts used for development and deployment

## Getting started

To run the scripts, you will need Python 3.8 or later, then from the repo route:

1. Create a Python virtual environment, eg, `python3 -m venv ./venv`
2. Activate the venv, eg, `source venv/bin/activate`
3. Pip install requiremnts, eg, `pip install -r scripts/requirements.txt`

## Generating a dataset graph

The current development app is hard-wired to load /dataset_graph.json (eg, public/dataset_graph.json).
To generate that file from one or more H5ADs, you will need to execute the following multi-step process.
For a small number of cells, it will run on a laptop, but for a large collection (eg, the entire
cellxgene corpus), you will need a very large EC2 instance (eg, r6i.32xlarge).

Steps:

1. Download all of the H5ADs you want to process into a directory. If you want to get the entire cellxgene public corpus, use `get_public_datasets.py`. For example, to download all public H5ADs into the directory `/tmp/all_h5ads/`:

   ```bash
   python scripts/get_public_datasets.py aws-cp-commands --base-path /tmp/all_h5ads/ | while read i ; do bash -c "$i" ; done
   ```

2. Create a manifest of all H5ADs that you want to process. The manifest is a CSV file containing `dataset_id, dataset_path`, where `dataset_id` is a _unique_ ID for the dataset, and `dataset_path` is a file system path to the H5AD. For example, if you had used the above script to copy files from the cellxgene corpus:

   ```bash
   find /tmp/all_h5ads/ -name 'local.h5ad' -print | while read i ; do echo $(basename $(dirname $i)),$i ; done > /tmp/agg.manifest
   ```

   When done, the file should look something like:

   ```csv
   aad97cb5-f375-45ef-ae9d-178e7f5d5180,/tmp/all_h5ads/aad97cb5-f375-45ef-ae9d-178e7f5d5180/local.h5ad
   43b460b5-9863-414e-88ea-50bc1f5b60e0,/tmp/all_h5ads/43b460b5-9863-414e-88ea-50bc1f5b60e0/local.h5ad
   9dfd2243-74d6-4924-86bd-c206ca9287b1,/tmp/all_h5ads/9dfd2243-74d6-4924-86bd-c206ca9287b1/local.h5ad
   add5eb84-5fc9-4f01-982e-a346dd42ee82,/tmp/all_h5ads/add5eb84-5fc9-4f01-982e-a346dd42ee82/local.h5ad
   ```

3. Create the aggregation and pre-process all cells in a single aggregated data structure. This example names the aggregation `agg`, but you can rename it:

   ```bash
   python -m scripts.create_dataset_graph -v /tmp/agg create --manifest /tmp/agg.manifest

   python -m scripts.create_dataset_graph -v /tmp/agg load-X --manifest /tmp/agg.manifest

   python -m scripts.create_dataset_graph -v /tmp/agg rank-cells
   ```

4. Create ranked gene groups from the aggregations. This will create a JSON file with ranked genes by category label (by default, `cell_type_ontology_term_id` and `tissue_ontology_term_id`):

   ```bash
   python -m scripts.create_dataset_graph -v /tmp/agg rank-genes-groups -o /tmp/rank_genes.json
   ```

5. Create the ontology graph, annotated with the ranked genes:

   ```bash
   python -m scripts.create_dataset_graph -v /tmp/agg create-graph --rank-genes-groups /tmp/rank_genes.json -o public/dataset_graph.json
   ```

6. Clean up the intermediate files, eg,

   ```bash
   rm -rf /tmp/agg /tmp/agg.manifest /tmp/rank_genes.json
   ```
