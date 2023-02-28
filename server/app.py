from flask import Flask
import requests # https://stackoverflow.com/questions/2018026/what-are-the-differences-between-the-urllib-urllib2-urllib3-and-requests-modul
import cell_census

# cors
from flask_cors import CORS, cross_origin
app = Flask(__name__)

# cors
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

# open connection to the census, as of 0.4.0 this needs to be closed manually? 
# https://github.com/chanzuckerberg/cell-census/releases/tag/v0.4.0
census = cell_census.open_soma()

@app.route('/')
def hello_world():
    return '<h1>This is the "/" route for the python backend for cellxgene-ontology</h1>'

# this route will be hit from a react app running on port 3000
# it will return a json object
@app.route('/api')
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

    # Dropping the soma_joinid column as it isn't useful in this demo
    census_summary_cell_counts = census_summary_cell_counts.drop(columns=["soma_joinid"])

    # print the head of the dataframe 
    print(census_summary_cell_counts.head())

    # create the json we're going to return, which will look like this and ONLY include the Homo Sapiens data (from the organism column)
    # {
    # data: [
    #     {
    #         "cell_type": "astrocyte", # where this is the ontology_term_id column
    #         "unique_cell_count": 0.0 # where this is the total cell count column
    #     },
    # ]
    # }

    # create the data array
    json = {}
    # loop through the dataframe
    for index, row in census_summary_cell_counts.iterrows():
        # limit to humans
        if row["organism"] != "Homo sapiens":
            continue

        json[row["ontology_term_id"]] = row["unique_cell_count"]

    # return the json object
    return json



