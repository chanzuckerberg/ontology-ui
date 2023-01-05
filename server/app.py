from flask import Flask
import requests # https://stackoverflow.com/questions/2018026/what-are-the-differences-between-the-urllib-urllib2-urllib3-and-requests-modul
 
# cors
from flask_cors import CORS, cross_origin
app = Flask(__name__)

# cors
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

@app.route('/')
def hello_world():
    return '<h1>Hello, World!</h1>'

# this route will be hit from a react app running on port 3000
# it will return a json object
@app.route('/api')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def api():
    return {'hello': 'world'}

@app.route('/portalDatasets')
@cross_origin(origin='localhost',headers=['Content- Type','Authorization'])
def portalDatasets():
    # make a request to the url "https://api.cellxgene.cziscience.com/dp/v1/datasets/index"
    # and return the response

    # first we make a request to the url
    response = requests.get("https://api.cellxgene.cziscience.com/dp/v1/datasets/index")   
    # then we return the response
    return response.json()



    
