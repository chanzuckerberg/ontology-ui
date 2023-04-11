from flask import Flask
import requests # https://stackoverflow.com/questions/2018026/what-are-the-differences-between-the-urllib-urllib2-urllib3-and-requests-modul
import cell_census
import pandas as pd
from rollup import rollup_across_cell_type_descendants, ALL_CELL_ONTOLOGY_TERMS
# cors
from flask_cors import CORS, cross_origin

app = Flask(__name__)

# cors
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


# open connection to the census, as of 0.4.0 this needs to be closed manually? 
# https://github.com/chanzuckerberg/cell-census/releases/tag/v0.4.0
census = cell_census.open_soma()

@app.route('/api')
def hello_world():
    return '<h1>This is the "/" route for the python backend for cellxgene-ontology</h1>'

# this route will be hit from a react app running on port 3000
# it will return a json object
@app.route('/api/health')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def api():
    return {'hello': 'world'}

@app.route('/api/portalDatasets')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def portalDatasets():
    # make a request to the url "https://api.cellxgene.cziscience.com/dp/v1/datasets/index"
    # and return the response

    # first we make a request to the url
    response = requests.get("https://api.cellxgene.cziscience.com/dp/v1/datasets/index")   
    # then we return the response
    return response.json()

@app.route('/api/census/cellMetadataFields')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def cellMetadata():
    return list(census["census_data"]["homo_sapiens"].obs.keys())

@app.route('/api/census/cellCounts')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def cellCounts():
    # basic use of the census_summary_cell_counts dataframe.
    # Each Cell Census contains a top-level dataframe summarizing counts of various cell labels. You can read this into a Pandas DataFrame:
    census_summary_cell_counts = census["census_info"]["summary_cell_counts"].read().concat().to_pandas()
    
    # limit to humans and cell types
    census_summary_cell_counts = census_summary_cell_counts[census_summary_cell_counts["organism"]=="Homo sapiens"]
    census_summary_cell_counts = census_summary_cell_counts[census_summary_cell_counts["category"]=="cell_type"]
    
    # get the columns we care about
    census_summary_cell_counts = census_summary_cell_counts[["ontology_term_id","unique_cell_count"]]

    # add missing CL terms to rollup into
    MISSING_CL_TERMS = list(set(ALL_CELL_ONTOLOGY_TERMS).symmetric_difference(set(census_summary_cell_counts["ontology_term_id"])))
    added_empty_rows = pd.DataFrame([{"ontology_term_id": cl, "unique_cell_count": 0} for cl in MISSING_CL_TERMS])
    census_summary_cell_counts = pd.concat([census_summary_cell_counts, added_empty_rows])
    
    # do the rollup
    rollup_cell_type_df = rollup_across_cell_type_descendants(census_summary_cell_counts)
    census_summary_cell_counts["unique_cell_count_with_descendants"] = rollup_cell_type_df["unique_cell_count"]

    # create the json we're going to return, which will look like this and ONLY include the Homo Sapiens data (from the organism column)
    # {
    # data: [
    #     {
    #         "cell_type": "astrocyte", # where this is the ontology_term_id column
    #         "unique_cell_count": 0.0 # where this is the total cell count column
    #     },
    # ]
    # }
    census_summary_cell_counts = census_summary_cell_counts.set_index("ontology_term_id")
    records = census_summary_cell_counts.to_dict('records')
    return dict(zip(census_summary_cell_counts.index,records))    



