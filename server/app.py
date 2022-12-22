# Here we write a hello world Flask server
from flask import Flask
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
