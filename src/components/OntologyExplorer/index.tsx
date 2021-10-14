import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";
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
  forceCanvasWidth: number;
  forceCanvasHeight: number;
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
  sugiyamaRenderThreshold: number;
  cardWidth: number;
  cardHeight: number;
  menubarHeight: number;
}

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      sugiyamaStratifyData: null,
      scaleFactor: 0.8,
      translateCenter: -350,
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
      sugiyamaRenderThreshold: 100,
      forceCanvasWidth: 850,
      forceCanvasHeight: 850,
      cardWidth: 350,
      cardHeight: 850, // 850 default, 2000 full
      menubarHeight: 70,
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
        // v.descendants.length === 0 || // zero descendants
        v.label.includes("Mus musculus") || // mouse
        !v.label.includes("kidney") // limit to b cell subset
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
    const {
      forceCanvasWidth,
      forceCanvasHeight,
      scaleFactor,
      translateCenter,
      hullsTurnedOn,
    } = this.state;

    const redrawCanvas = drawForceDag(
      nodes, // todo, mutates
      links, // todo, mutates
      forceCanvasWidth,
      forceCanvasHeight,
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
      forceCanvasWidth,
      forceCanvasHeight,
      hoverNode,
      pinnedNode,
      canvasRenderCounter,
      dagSearchText,
      simulationRunning,
      maxRenderCounter,
      sugiyamaRenderThreshold,
      cardWidth,
      cardHeight,
      menubarHeight,
    } = this.state;

    return (
      <div id="ontologyExplorerContainer">
        {/**
         * Render controls
         */}
        <div
          id="menubar"
          style={{
            height: menubarHeight,
            // border: "1px solid lightblue",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            <p
              style={{
                fontSize: 24,
                fontWeight: 900,
                margin: 0,
                marginRight: 10,
                padding: 0,
              }}
            >
              ontology explorer
            </p>
            <input
              type="text"
              placeholder="Substring search"
              style={{
                fontSize: 14,
                margin: 0,
                marginRight: 10,
              }}
              onChange={this.handleDagSearchChange}
              value={simulationRunning ? "Computing layout..." : dagSearchText}
            />
            <p>help</p>
          </div>
        </div>
        <div id="horizontalScroll">
          <div
            id="card"
            style={{
              width: cardWidth,
              height: cardHeight,
              overflow: "scroll",
              // border: "1px solid blue",
              margin: 0,
            }}
          >
            <div
              id="innerDivToPreventPaddingSizeIncrease"
              style={{ padding: 10 }}
            >
              {/**
               * Render cards
               */}
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
            </div>
          </div>
          {/**
           * Render ontology force layout
           */}
          {nodes &&
            links &&
            canvasRenderCounter < maxRenderCounter &&
            this.initializeCanvasRenderer(nodes, links, ontology)}
          <canvas
            style={{
              position: "absolute",
              top: menubarHeight,
              left: cardWidth,
              zIndex: 9999,
              cursor: "crosshair",
              // border: "1px solid green",
            }}
            width={forceCanvasWidth}
            height={forceCanvasHeight}
            ref={this.dagCanvasRef}
          />
          {/**
           * Render sugiyama
           */}
          {sugiyamaStratifyData &&
            sugiyamaStratifyData.length < sugiyamaRenderThreshold && (
              <div
                style={{
                  position: "absolute",
                  top: menubarHeight,
                  left: cardWidth + forceCanvasWidth,
                }}
              >
                <Sugiyama
                  sugiyamaStratifyData={sugiyamaStratifyData}
                  ontology={ontology}
                />
              </div>
            )}
        </div>
      </div>
    );
  }
}

export default OntologyExplorer;
