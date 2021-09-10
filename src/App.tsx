import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Vertex from "./components/Vertex";
import loadOntologies from "./util/loadOntologies";
import { IOntology } from "./d";

interface IProps {}

interface IState {
  ontology: null | IOntology;
  selectedVertex: string;
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { ontology: null, selectedVertex: "CL:0000623" };
  }

  async componentDidMount() {
    const _o = await loadOntologies("http://localhost:8080/all_ontology.json");
    let arr = Object.entries(_o.CL);
    /* make a map of the ontology values for easy getting and setting */
    let ontology = new Map(arr);

    this.setState({ ontology });
  }

  render() {
    const { ontology } = this.state;
    return (
      <div>
        {!this.state.ontology && "Loading..."}
        {ontology && (
          <Vertex ontology={ontology} vertex={ontology.get("CL:0000623")} />
        )}
      </div>
    );
  }
}

export default App;
