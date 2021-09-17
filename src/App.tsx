import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Vertex from "./components/Vertex";
import DiscoveryLog from "./components/DiscoveryLog";
import load from "./util/load";
import { IOntology } from "./d";

interface IProps {}

interface IState {
  ontology: null | IOntology;
  defaultVertex: string;
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { ontology: null, defaultVertex: "CL:0000623" };
  }

  async componentDidMount() {
    const _o = await load("http://localhost:8080/all_ontology.json");
    let arr = Object.entries(_o.CL);
    /* make a map of the ontology values for easy getting and setting */
    let ontology = new Map(arr);
    console.log(ontology);
    this.setState({ ontology });
  }

  render() {
    const { ontology, defaultVertex } = this.state;

    return (
      <Router>
        <div
          id="container"
          style={{
            margin: "0 auto",
            maxWidth: "50em",
            fontFamily: "Helvetica, Arial, sans-serif",
            lineHeight: 1.5,
            padding: "4em 1em",
            color: "#555",
          }}
        >
          {!this.state.ontology && "Loading..."}

          {ontology && (
            <Switch>
              <Route
                path="/cell/:vertex"
                render={({ match }) => {
                  return (
                    <Vertex
                      ontology={ontology}
                      vertex={ontology.get(match.params.vertex)}
                      vertexID={match.params.vertex}
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
