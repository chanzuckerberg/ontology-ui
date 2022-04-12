import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Helmet } from "react-helmet";

import Vertex from "./components/Vertex";
import Dag from "./components/OntologyExplorer";
import ThreeOntology from "./components/ThreeOntology";
import DiscoveryLog from "./components/DiscoveryLog";
import loadDatasetGraph from "./util/loadDatasetGraph";
import { DatasetGraph, Ontology } from "./d";

interface IProps {}

interface IState {
  graph?: DatasetGraph;
  lattice?: Ontology;
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      graph: undefined,
      lattice: undefined,
    };
  }

  async componentDidMount() {
    const [graph, lattice] = await loadDatasetGraph("/dataset_graph.json");
    this.setState({ graph, lattice });
  }

  render() {
    const { graph, lattice } = this.state;
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
          {!graph && "Loading..."}
          <Helmet>
            <meta charSet="utf-8" />
            <title>Cell Ontology</title>
          </Helmet>

          {graph && lattice && (
            <Switch>
              <Route
                path="/cell/ontology"
                render={({ match }) => {
                  return (
                    <Dag
                      ontologyName="cl"
                      ontology={graph.ontologies.CL}
                      lattice={lattice}
                      uberon={graph.ontologies.UBERON}
                    />
                  );
                }}
              />
              <Route
                path="/cell/three"
                render={({ match }) => {
                  return (
                    <ThreeOntology
                      ontologyName="cl"
                      ontology={graph.ontologies.CL}
                    />
                  );
                }}
              />
              <Route
                path="/cell/:vertex"
                render={({ match }) => {
                  return (
                    <Vertex
                      ontologyName="cl"
                      ontology={graph.ontologies.CL}
                      vertex={graph.ontologies.CL.get(match.params.vertex)}
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
                      ontology={graph.ontologies.MONDO}
                      lattice={lattice}
                      uberon={graph.ontologies.UBERON}
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
                      ontology={graph.ontologies.MONDO}
                      vertex={graph.ontologies.MONDO.get(match.params.vertex)}
                      vertexID={match.params.vertex}
                      lattice={lattice}
                    />
                  );
                }}
              />
              <Route
                path="/compartment/ontology"
                render={({ match }) => {
                  return (
                    <Dag
                      ontologyName="uberon"
                      ontology={graph.ontologies.UBERON}
                      lattice={lattice}
                      uberon={graph.ontologies.UBERON}
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
                      ontology={graph.ontologies.UBERON}
                      vertex={graph.ontologies.UBERON.get(match.params.vertex)}
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
