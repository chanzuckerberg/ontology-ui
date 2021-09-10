import React from "react";
import { IOntology } from "../d";
import Vertex from "./Vertex";

interface IProps {
  ontology: IOntology;
}

interface IState {}

class Ontology extends React.Component<IProps, IState> {
  render() {
    const { ontology } = this.props;
    return (
      <div>
        {/* hardcoded entry point at natural killer cell */}
        <Vertex ontology={ontology} vertex={ontology.get("CL:0000623")} />
      </div>
    );
  }
}

export default Ontology;
