import React from "react";
import Ontology from "./components/Ontology";
import loadOntologies from "./util/loadOntologies";
import { Vertex } from "./d";

interface IProps {}

interface IState {
  ontology: null | Vertex[];
}

class App extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { ontology: null };
  }

  async componentDidMount() {
    const foo = await loadOntologies("http://localhost:8080/all_ontology.json");
    this.setState({ ontology: foo.CL });
  }

  render() {
    return (
      <div>
        {!this.state.ontology && "Loading..."}
        {this.state.ontology && <Ontology data={this.state.ontology} />}
      </div>
    );
  }
}

export default App;
