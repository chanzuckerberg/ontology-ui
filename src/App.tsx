import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Helmet } from "react-helmet";

import Vertex from "./components/Vertex";
import Dag from "./components/OntologyExplorer";
import ThreeOntology from "./components/ThreeOntology";
import DiscoveryLog from "./components/DiscoveryLog";
import load from "./util/load";
import { IOntology } from "./d";

interface IProps {}

interface IState {
  cl_ontology: null | IOntology;
  mondo_ontology: null | IOntology;
  uberon_ontology: null | IOntology;
  lattice: null | IOntology;
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      cl_ontology: null,
      mondo_ontology: null,
      uberon_ontology: null,
      lattice: null,
    };
  }

  async componentDidMount() {
    const _o = await load("http://localhost:8080/all_ontology.json");
    const _lattice = await load("http://localhost:8080/lattice.json");

    /* make a map of the ontology values for easy getting and setting */
    let cl_ontology = new Map(Object.entries(_o.CL));
    let mondo_ontology = new Map(Object.entries(_o.MONDO));
    let uberon_ontology = new Map(Object.entries(_o.UBERON));
    let lattice = new Map(Object.entries(_lattice));

    this.setState({ cl_ontology, mondo_ontology, uberon_ontology, lattice });
  }

  render() {
    const { cl_ontology, mondo_ontology, uberon_ontology, lattice } =
      this.state;

    return (
      <Router>
        <div
          id="container"
          style={{
            fontFamily: "Helvetica, Arial, sans-serif",
            lineHeight: 1.5,
            color: "#555",
          }}
        >
          {!cl_ontology && "Loading..."}
          <Helmet>
            <meta charSet="utf-8" />
            <title>Cell Ontology</title>
          </Helmet>

          {cl_ontology && mondo_ontology && uberon_ontology && lattice && (
            <Switch>
              <Route
                path="/cell/ontology"
                render={({ match }) => {
                  return (
                    <Dag
                      ontologyName="cl"
                      ontology={cl_ontology}
                      lattice={lattice}
                      uberon={uberon_ontology}
                    />
                  );
                }}
              />
              <Route
                path="/cell/three"
                render={({ match }) => {
                  return (
                    <ThreeOntology ontologyName="cl" ontology={cl_ontology} />
                  );
                }}
              />
              <Route
                path="/cell/:vertex"
                render={({ match }) => {
                  return (
                    <Vertex
                      ontologyName="cl"
                      ontology={cl_ontology}
                      vertex={cl_ontology.get(match.params.vertex)}
                      vertexID={match.params.vertex}
                      lattice={lattice}
                    />
                  );
                }}
              />
              <Route
                path="/disease/dag"
                render={({ match }) => {
                  return (
                    <Dag
                      ontologyName="mondo"
                      ontology={mondo_ontology}
                      lattice={lattice}
                      uberon={uberon_ontology}
                    />
                  );
                }}
              />
              <Route
                path="/disease/:vertex"
                render={({ match }) => {
                  return (
                    <Vertex
                      ontologyName="mondo"
                      ontology={mondo_ontology}
                      vertex={mondo_ontology.get(match.params.vertex)}
                      vertexID={match.params.vertex}
                      lattice={lattice}
                    />
                  );
                }}
              />
              <Route
                path="/compartment/dag"
                render={({ match }) => {
                  return (
                    <Dag
                      ontologyName="uberon"
                      ontology={uberon_ontology}
                      lattice={lattice}
                      uberon={uberon_ontology}
                    />
                  );
                }}
              />
              <Route
                path="/compartment/:vertex"
                render={({ match }) => {
                  return (
                    <Vertex
                      ontologyName="uberon"
                      ontology={uberon_ontology}
                      vertex={uberon_ontology.get(match.params.vertex)}
                      vertexID={match.params.vertex}
                      lattice={lattice}
                    />
                  );
                }}
              />
              <Route
                path="/discovery-log"
                render={() => {
                  return <DiscoveryLog />;
                }}
              />
            </Switch>
          )}
        </div>
      </Router>
    );
  }
}

export default App;
