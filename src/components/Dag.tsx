import React from "react";
import {} from "../d";

import dag from "d3-dag";

interface IProps {
  ontologyName: string;
  ontology: Map<string, unknown | object>;
}

interface IState {}

class Vertex extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {}

  render() {
    const { ontology } = this.props;
    const {} = this.state;

    console.log("ontology", ontology);

    return <div></div>;
  }
}

export default Vertex;
