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
      <div
        style={{
          margin: "none",
          padding: "none",
          fontSize: 10,
          lineHeight: 0,
        }}
      >
        <h1>{vertex.label}</h1>
        <h3> Ancestors </h3>

        {vertex.ancestors.map((ancestor: string) => {
          const _a: any = ontology.get(ancestor);
          return <p key={ancestor}> {_a.label} </p>;
        })}

        <h3> Descendents </h3>
        {vertex.descendants.map((descendant: string) => {
          const _d: any = ontology.get(descendant);
          return <p key={descendant}> {_d.label} </p>;
        })}
      </div>
    );
  }
}

export default Vertex;
