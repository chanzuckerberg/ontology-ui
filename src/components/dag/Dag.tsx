import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { greaterThanThirtyDescendants } from "./toFilter";
import { createNodesLinksHulls } from "./setup";
import { drawForceDag } from "./draw";
import Vertex from "../Vertex";

import { IOntology } from "../../d";

export interface OntologyVertexDatum extends SimulationNodeDatum {
  id: "string";
  ancestorCount: number;
  descendantCount: number;
}

interface IProps {
  ontologyName: string;
  ontology: Map<string, unknown | object>;
  lattice: null | IOntology;
}

interface IState {
  nodes: OntologyVertexDatum[] | null;
  links: SimulationLinkDatum<any>[] | null;
  width: number;
  height: number;
  currentNode: any /* from d3 hover */;
  canvasRenderCounter: number;
}

class DAG extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      width: 2000,
      height: 2000,
      currentNode: null,
      canvasRenderCounter: 0,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;

    // ontology.forEach((v: any, id) => {
    //   if (v.descendants.length > 30) {
    //     console.log(id, v);
    //   }
    // });

    const { nodes, links } = createNodesLinksHulls(
      ontology,
      greaterThanThirtyDescendants
    );
    this.setState({ nodes, links });
  }

  setCurrentNode = (currentNode: string) => {
    this.setState({ currentNode });
  };

  incrementRenderCounter = () => {
    let { canvasRenderCounter } = this.state;
    this.setState({ canvasRenderCounter: (canvasRenderCounter += 1) });
  };

  render() {
    const { ontology, lattice } = this.props;
    const { nodes, links, width, height, currentNode, canvasRenderCounter } =
      this.state;
    console.log("parent dag", currentNode);
    return (
      <div>
        {nodes &&
          links &&
          canvasRenderCounter < 1 &&
          drawForceDag(
            nodes,
            links,
            width,
            height,
            this.dagCanvasRef,
            ontology,
            greaterThanThirtyDescendants,
            this.setCurrentNode,
            this.incrementRenderCounter
          )}
        {currentNode && (
          <Vertex
            ontologyName="cl"
            ontology={ontology}
            vertex={ontology.get(currentNode.id)}
            vertexID={currentNode.id}
            lattice={lattice}
          />
        )}
        <canvas
          style={{
            border: "1px solid pink",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: -9999,
          }}
          width={width}
          height={height}
          ref={this.dagCanvasRef}
        />
      </div>
    );
  }
}

export default DAG;
