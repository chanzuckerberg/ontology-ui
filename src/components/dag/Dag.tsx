import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { greaterThanThirtyDescendants } from "./toFilter";
import { createNodesLinksHulls } from "./createNodesLinksHulls";
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
  hoverNode: any /* from d3 force node hover */;
  pinnedNode: any /* from d3 force node click */;
  canvasRenderCounter: number;
  dagSearchText: string;
  redrawCanvas: any /* function to force render canvas */;
}

class DAG extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      width: 2000,
      height: 2000,
      hoverNode: null,
      pinnedNode: null,
      canvasRenderCounter: 0,
      dagSearchText: "",
      redrawCanvas: null,
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

  setHoverNode = (hoverNode: any) => {
    this.setState({ hoverNode });
  };
  setPinnedNode = (pinnedNode: any) => {
    this.setState({ pinnedNode });
  };

  incrementRenderCounter = () => {
    let { canvasRenderCounter } = this.state;
    this.setState({ canvasRenderCounter: (canvasRenderCounter += 1) });
  };

  initializeCanvasRenderer = (
    nodes: OntologyVertexDatum[],
    links: SimulationLinkDatum<any>[],
    ontology: IOntology
  ) => {
    const { width, height } = this.state;

    const redrawCanvas = drawForceDag(
      nodes,
      links,
      width,
      height,
      this.dagCanvasRef,
      ontology,
      greaterThanThirtyDescendants,
      this.setHoverNode,
      this.setPinnedNode,
      this.incrementRenderCounter
    );

    this.setState({ redrawCanvas });
  };

  /**
   * @param e is a react syntheticevent type, todo
   */
  handleDagSearchChange = (e: any) => {
    const { redrawCanvas } = this.state;
    this.setState({
      dagSearchText: e.target.value,
    });
    if (redrawCanvas) {
      redrawCanvas(e.target.value);
    }
  };

  render() {
    const { ontology, lattice } = this.props;
    const {
      nodes,
      links,
      width,
      height,
      hoverNode,
      pinnedNode,
      canvasRenderCounter,
      dagSearchText,
    } = this.state;

    return (
      <div>
        {nodes &&
          links &&
          canvasRenderCounter < 1 &&
          this.initializeCanvasRenderer(nodes, links, ontology)}
        {!pinnedNode && hoverNode && (
          <Vertex
            ontologyName="cl"
            ontology={ontology}
            vertex={ontology.get(hoverNode.id)}
            vertexID={hoverNode.id}
            lattice={lattice}
          />
        )}
        {pinnedNode && (
          <Vertex
            ontologyName="cl"
            ontology={ontology}
            vertex={ontology.get(pinnedNode.id)}
            vertexID={pinnedNode.id}
            lattice={lattice}
          />
        )}
        <input
          type="text"
          style={{ fontSize: 24 }}
          onChange={this.handleDagSearchChange}
          value={dagSearchText}
        />
        <canvas
          style={{
            border: "1px solid pink",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: -9999,
            cursor: "crosshair",
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
