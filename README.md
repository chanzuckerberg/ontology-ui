# Ontology UI

This is a prototype repository for research related to ontology visualization and cell types

### Client

React, with create-react-app

### Usage

From the root of the project:

`$ npm install`
`$ npm install -g http-server`

prototype code is hardcoded to look for localhost port 8080, which is the default for `http-server`

Terminal 1:
`$ http-server ./public --gzip --cors --proxy http://www.ebi.ac.uk/ols/api`

Terminal 2:
`$ npm start`

### Routing

Start here: `/cell/ontology`

`/:vertex`

### Proxying requests

Requests to the EBI API are proxied using https://www.npmjs.com/package/http-server's proxy for unhandled requests locally, for development purposes.

### Typescript

Types can be found in `src/d.ts`

### Security

Please note: If you believe you have found a security issue, please responsibly disclose by contacting us at security@chanzuckerberg.com

### Contributing

This project adheres to the Contributor Covenant code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to opensource@chanzuckerberg.com.
