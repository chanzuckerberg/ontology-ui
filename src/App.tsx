import React from "react";
import Ontology from "./components/Ontology";
import loadOntologies from "./util/loadOntologies";
import { IOntology } from "./d";

interface IProps {}

interface IState {
  ontology: null | IOntology;
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { ontology: null };
  }

  async componentDidMount() {
    const _o = await loadOntologies("http://localhost:8080/all_ontology.json");
    let arr = Object.entries(_o.CL);
    /* make a map of the ontology values for easy getting and setting */
    let ontology = new Map(arr);

    this.setState({ ontology });
  }

  render() {
    return (
      <div>
        {!this.state.ontology && "Loading..."}
        {this.state.ontology && <Ontology ontology={this.state.ontology} />}
      </div>
    );
  }
}

export default App;
