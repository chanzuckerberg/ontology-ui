import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "./createNodesLinksHulls";
import { drawForceDag } from "./draw";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";

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
  sugiyamaStratifyData: any;
  width: number;
  height: number;
  scaleFactor: number;
  translateCenter: number;
  hoverNode: any /* from d3 force node hover */;
  pinnedNode: any /* from d3 force node click */;
  canvasRenderCounter: number;
  dagSearchText: string;
  redrawCanvas: any /* function to force render canvas */;
  simulationRunning: boolean;
  outdegreeCutoff: number /* max descendants */;
  filteredNodes: string[];
  hullsTurnedOn: boolean;
  maxRenderCounter: number;
}

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      sugiyamaStratifyData: null,
      width: 700,
      height: 700,
      scaleFactor: 0.8,
      translateCenter: 0,
      hoverNode: null,
      pinnedNode: null,
      canvasRenderCounter: 0,
      dagSearchText: "",
      redrawCanvas: null,
      simulationRunning: false,
      outdegreeCutoff: 50,
      filteredNodes: [],
      hullsTurnedOn: false,
      maxRenderCounter: 1,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;
    const { outdegreeCutoff } = this.state;

    /**
     * this could be broken out, as a feature, as:
     * [x] toggle off leaf nodes, descendants === 0
     * [50] choose outdegree limit
     * in which case we would want this to be multiple
     * arrays that we merge, maybe easier to force remount
     * than keep track of render count at that point?
     */
    const filteredNodes: string[] = [];

    /**
     * choose which nodes not to show
     */
    ontology.forEach((v: any, id) => {
      if (
        v.descendants.length > outdegreeCutoff || // more than n descendants
        v.descendants.length === 0 || // zero descendants
        v.label.includes("Mus musculus") || // mouse
        !v.label.includes("B cell") // limit to b cell subset
      ) {
        filteredNodes.push(id);
      }
    });

    const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
      ontology,
      filteredNodes
    );
    this.setState({ nodes, links, filteredNodes, sugiyamaStratifyData });
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
    this.setState({ simulationRunning: false });
  };

  initializeCanvasRenderer = (
    nodes: OntologyVertexDatum[],
    links: SimulationLinkDatum<any>[],
    ontology: IOntology
  ) => {
    const { width, height, scaleFactor, translateCenter, hullsTurnedOn } =
      this.state;

    const redrawCanvas = drawForceDag(
      nodes, // todo, mutates
      links, // todo, mutates
      width,
      height,
      scaleFactor,
      translateCenter,
      this.dagCanvasRef,
      ontology,
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
      sugiyamaStratifyData,
      width,
      height,
      hoverNode,
      pinnedNode,
      canvasRenderCounter,
      dagSearchText,
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
          style={{
            position: "absolute",
            left: 10,
            top: 10,
            fontSize: 14,
            padding: 4,
          }}
          onChange={this.handleDagSearchChange}
          value={simulationRunning ? "Computing layout..." : dagSearchText}
        />
        {sugiyamaStratifyData && sugiyamaStratifyData.length < 100 && (
          <Sugiyama
            sugiyamaStratifyData={sugiyamaStratifyData}
            ontology={ontology}
          />
        )}
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

export default OntologyExplorer;
