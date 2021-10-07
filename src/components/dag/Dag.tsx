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
  simulationRunning: boolean;
  outdegreeCutoff: number /* max descendants */;
  outDegreeFilteredNodes: string[];
  hullsTurnedOn: boolean;
  maxRenderCounter: number;
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
      simulationRunning: false,
      outdegreeCutoff: 50,
      outDegreeFilteredNodes: [],
      hullsTurnedOn: false,
      maxRenderCounter: 1,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;
    const { outdegreeCutoff } = this.state;

    const outDegreeFilteredNodes: string[] = [];

    ontology.forEach((v: any, id) => {
      if (v.descendants.length > outdegreeCutoff) {
        outDegreeFilteredNodes.push(id);
      }
    });

    const { nodes, links } = createNodesLinksHulls(
      ontology,
      outDegreeFilteredNodes
    );
    this.setState({ nodes, links, outDegreeFilteredNodes });
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

  onForceSimulationEnd = () => {
    const simulationRunning = this.state;
    this.setState({ simulationRunning: false });
  };

  initializeCanvasRenderer = (
    nodes: OntologyVertexDatum[],
    links: SimulationLinkDatum<any>[],
    ontology: IOntology
  ) => {
    const { width, height, hullsTurnedOn } = this.state;

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
      this.incrementRenderCounter,
      this.onForceSimulationEnd,
      hullsTurnedOn
    );

    this.setState({ redrawCanvas, simulationRunning: true });
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
    const { ontology, ontologyName, lattice } = this.props;
    const {
      nodes,
      links,
      width,
      height,
      hoverNode,
      pinnedNode,
      canvasRenderCounter,
      dagSearchText,
      redrawCanvas,
      simulationRunning,
      maxRenderCounter,
    } = this.state;

    return (
      <div>
        {nodes &&
          links &&
          canvasRenderCounter < maxRenderCounter &&
          this.initializeCanvasRenderer(nodes, links, ontology)}
        {!pinnedNode && hoverNode && (
          <Vertex
            ontologyName={ontologyName}
            ontology={ontology}
            vertex={ontology.get(hoverNode.id)}
            vertexID={hoverNode.id}
            lattice={lattice}
          />
        )}
        {pinnedNode && (
          <Vertex
            ontologyName={ontologyName}
            ontology={ontology}
            vertex={ontology.get(pinnedNode.id)}
            vertexID={pinnedNode.id}
            lattice={lattice}
          />
        )}
        <input
          type="text"
          placeholder="Substring search"
          style={{ position: "absolute", left: 10, top: 10, fontSize: 24 }}
          onChange={this.handleDagSearchChange}
          value={simulationRunning ? "Computing layout..." : dagSearchText}
        />
        <canvas
          style={{
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
