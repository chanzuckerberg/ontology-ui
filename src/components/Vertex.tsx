import React from "react";

interface IProps {
  ontology: Map<string, unknown | object>;
  vertex: any;
}

interface IState {}

class Vertex extends React.Component<IProps, IState> {
  render() {
    const { ontology, vertex } = this.props;

    return (
      <div>
        <h1>{vertex.label}</h1>
        <h3> Ancestors </h3>

        {/* <ul>
          {vertex.ancestors.map((ancestor: string) => {
            const _a: any = ontology.get(ancestor);
            return <li key={ancestor}> {_a.label} </li>;
          })}
        </ul>

        <h3> Descendents </h3>
        <ul>
          {vertex.descendants.map((descendant: string) => {
            const _d: any = ontology.get(descendant);
            return <li key={descendant}> {_d.label} </li>;
          })}
        </ul> */}
      </div>
    );
  }
}

export default Vertex;
