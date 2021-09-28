import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { drawForceDag, createNodesAndLinks } from "./setup";

export interface OntologyVertexDatum extends SimulationNodeDatum {
  id: "string";
}

interface IProps {
  ontologyName: string;
  ontology: Map<string, unknown | object>;
}

interface IState {
  nodes: OntologyVertexDatum[] | null;
  links: SimulationLinkDatum<any>[] | null;
  width: number;
  height: number;
}

class DAG extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      width: 3500,
      height: 3500,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;
    /**
     * This is a set of nodes we don't want in the graph, because of high connectivity. Manual override.
     * Included: cell, native cell, animal cell, eukaryotic cell, somatic cell
     */
    const nodesToFilter = [
      "CL:0000000",
      "CL:0000003",
      "CL:0000255",
      "CL:0000548",
      "CL:0002371",
      "CL:0000540",
      "CL:0000066",
    ];
    const { nodes, links } = createNodesAndLinks(ontology, nodesToFilter);
    this.setState({ nodes, links });
  }

  render() {
    const { ontology } = this.props;
    const { nodes, links, width, height } = this.state;

    return (
      <div>
        {nodes &&
          links &&
          drawForceDag(
            nodes,
            links,
            width,
            height,
            this.dagCanvasRef,
            ontology
          )}
        <canvas
          style={{ position: "absolute", top: 0, left: 0 }}
          width={width}
          height={height}
          ref={this.dagCanvasRef}
        />
      </div>
    );
  }
}

export default DAG;
