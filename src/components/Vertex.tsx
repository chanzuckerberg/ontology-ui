import React from "react";
import { Link } from "react-router-dom";
import fetchVertexEBI from "../util/fetchVertexEBI";

interface IProps {
  ontology: Map<string, unknown | object>;
  vertex: any;
}

interface IState {
  ebiData: null | object;
}

class Vertex extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { ebiData: null };
  }

  async componentDidMount() {
    const { vertex } = this.props;

    const _ebi = await fetchVertexEBI(vertex.label);
    console.log(_ebi);

    this.setState({ ebiData: _ebi });
  }

  render() {
    const { ontology, vertex } = this.props;

    return (
      <div>
        <h1>{vertex.label}</h1>
        <h3> Ancestors </h3>

        <ul>
          {vertex.ancestors.map((ancestor: string) => {
            const _a: any = ontology.get(ancestor);
            return (
              <li key={ancestor}>
                <Link to={ancestor}>{_a.label}</Link>
              </li>
            );
          })}
        </ul>

        <h3> Descendents </h3>
        <ol>
          {vertex.descendants.map((descendant: string) => {
            const _d: any = ontology.get(descendant);
            // if (_d.label.contains("mouse") || _d.label.contains("human")) return
            return (
              <li key={descendant}>
                <Link to={descendant}> {_d.label} </Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
}

export default Vertex;
