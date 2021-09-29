import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { greaterThanThirtyDescendants } from "./toFilter";
import { createNodesAndLinks } from "./setup";
import { drawForceDag } from "./draw";

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
      width: 2000,
      height: 2000,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;

    ontology.forEach((v: any, id) => {
      if (v.descendants.length > 30) {
        console.log(id, v);
      }
    });

    const { nodes, links } = createNodesAndLinks(
      ontology,
      greaterThanThirtyDescendants
    );
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
