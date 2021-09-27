import React from "react";

import { forceSimulation } from "d3-force";

interface IProps {
  ontologyName: string;
  ontology: Map<string, unknown | object>;
}

interface IState {
  nodesAndEdges: INodesAndEdges | null;
}

interface INodes {
  id: string;
}

interface ILinks {
  source: string;
  target: string;
}

interface INodesAndEdges {
  nodes: INodes[];
  links: ILinks[];
}

class Vertex extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodesAndEdges: null,
    };
  }

  componentDidMount() {
    const { ontology } = this.props;

    const nodesAndEdges: INodesAndEdges = {
      nodes: [],
      links: [],
    };

    /* todo typescript any, doesn't like IVertex for some reason */
    ontology.forEach((vertex: any, vertexID: string) => {
      nodesAndEdges.nodes.push({ id: vertexID });

      /* duplicative but unsure if there's an advantage in traversal */
      // vertex.ancestors.forEach((ancestor: string) => {
      //   nodesAndEdges.links.push({
      //     source: vertexID,
      //     target: ancestor,
      //     value: "ancestor",
      //   });
      // });
      vertex.descendants.forEach((descendent: string) => {
        nodesAndEdges.links.push({
          source: vertexID,
          target: descendent,
        });
      });
    });

    this.setState({ nodesAndEdges });
  }

  drawForce = () => {
    const { nodesAndEdges } = this.state;

    return null;
  };

  render() {
    return <div>{this.drawForce()}</div>;
  }
}

export default Vertex;
