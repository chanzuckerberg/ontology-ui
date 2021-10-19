import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";
import { drawForceDag } from "./draw";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";

import { majorCompartments } from "../../majorCompartments";

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
  uberon: null | IOntology;
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
  compartment: string | null;
  canvasRenderCounter: number;
  dagSearchText: string;
  subtreeRootID: string | null;
  isSubset: boolean;
  redrawCanvas: any /* function to force render canvas */;
  simulationRunning: boolean;
  outdegreeCutoffNodes: number /* max descendants */;
  outdegreeCutoffXYZ: number /* max descendants */;
  filteredOutNodes: string[];
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
      compartment: null,
      canvasRenderCounter: 0,
      dagSearchText: "",
      subtreeRootID: null,
      isSubset: false,
      redrawCanvas: null,
      simulationRunning: false,
      outdegreeCutoffNodes: 15, // for filter nodes
      outdegreeCutoffXYZ: 15,
      filteredOutNodes: [],
      hullsTurnedOn: false,
      maxRenderCounter: 1,
      sugiyamaRenderThreshold: 200,
      forceCanvasWidth: 850,
      forceCanvasHeight: 850,
      cardWidth: 350,
      cardHeight: 850, // 850 default, 2000 full
      menubarHeight: 70,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    this.createDag();
  }

  createDag = (subtreeRootID?: string) => {
    const { ontology } = this.props;
    const { outdegreeCutoffNodes, outdegreeCutoffXYZ } = this.state;

    /**
     * Choose which nodes to show, given a root, recursively grab get all descendants
     */
    const subtreeFromRootNode: string[] = [];

    const traceSubtree = (vertexID: string) => {
      const vertex: any = ontology.get(vertexID);
      if (vertex && vertex.descendants && vertex.descendants.length) {
        vertex.descendants.forEach((vertex: string) => {
          subtreeFromRootNode.push(vertex);
          traceSubtree(vertex);
        });
      }
    };

    if (subtreeRootID) {
      subtreeFromRootNode.push(subtreeRootID);
      traceSubtree(subtreeRootID);
    }

    /**
     * de duplicate subtree after recursive iteration, because dag
     */
    function onlyUnique(vertexID: string, index: number, subtree: string[]) {
      return subtree.indexOf(vertexID) === index;
    }

    const uniqueSubtreeFromRootNode = subtreeFromRootNode.filter(onlyUnique);

    /**
     * this could be broken out, as a feature, as:
     * [x] toggle off leaf nodes, descendants === 0
     * [50] choose outdegree limit
     * in which case we would want this to be multiple
     * arrays that we merge, maybe easier to force remount
     * than keep track of render count at that point?
     */
    const filteredOutNodes: string[] = [];
    /**
     * choose which nodes not to show, from entire ontology
     */
    ontology.forEach((v: any, id) => {
      if (
        // v.descendants.length > outdegreeCutoffNodes || // more than n descendants ... sometimes we want to remove the nodes, sometimes we want to xyz the links
        v.descendants.length < outdegreeCutoffNodes || // remove nodes with less than n descendants ... sometimes we want to start at cell and show the big stuff only
        // v.descendants.length === 0 || // zero descendants
        v.label.includes("Mus musculus") // mouse
        // !v.label.includes("kidney") // limit to b cell subset
      ) {
        filteredOutNodes.push(id);
      }
    });

    if (subtreeRootID) {
      const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
        ontology,
        filteredOutNodes, // get rid of stuff!
        outdegreeCutoffXYZ,
        uniqueSubtreeFromRootNode // include only this stuff!
      );
      this.setState({ nodes, links, filteredOutNodes, sugiyamaStratifyData });
    } else {
      const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
        ontology,
        filteredOutNodes, // get rid of stuff!
        outdegreeCutoffXYZ // remove xyz
      );
      this.setState({ nodes, links, filteredOutNodes, sugiyamaStratifyData });
    }
  };

  setHoverNode = (hoverNode: any) => {
    this.setState({ hoverNode });
  };
  setPinnedNode = (pinnedNode: any) => {
    this.setState({ pinnedNode });
  };

  subsetToNode = () => {
    const { pinnedNode, maxRenderCounter } = this.state;
    console.log(pinnedNode);
    this.setState({
      subtreeRootID: pinnedNode.id,
      isSubset: true,
      maxRenderCounter: maxRenderCounter + 1,
    });
    this.createDag(pinnedNode.id);
  };

  resetSubset = () => {
    const { maxRenderCounter } = this.state;

    this.setState({
      pinnedNode: null,
      subtreeRootID: null,
      isSubset: false,
      maxRenderCounter: maxRenderCounter + 1,
    });
    this.createDag();
  };

  incrementRenderCounter = () => {
    let { canvasRenderCounter } = this.state;
    this.setState({ canvasRenderCounter: (canvasRenderCounter += 1) });
  };

  onForceSimulationEnd = () => {
    this.setState({ simulationRunning: false });
  };

  handleOutdegreeCutoffChange = (e: any) => {
    const { maxRenderCounter } = this.state;
    console.log("e.target", e.target.value);
    this.setState({
      outdegreeCutoffNodes: e.target.value,
      maxRenderCounter: maxRenderCounter + 1,
    });
    this.createDag();
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
      compartment,
    } = this.state;

    const { lattice } = this.props;

    const _latticeCL = new Map();

    lattice?.forEach((value: any, key: any) => {
      if (key.includes("CL")) {
        _latticeCL.set(key, value);
      }
    });

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
      hullsTurnedOn,
      _latticeCL,
      compartment
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
    const { ontology, ontologyName, lattice, uberon } = this.props;
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
      isSubset,
      outdegreeCutoffNodes,
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
              alignItems: "baseline",
              paddingLeft: 10,
              paddingRight: 10,
            }}
          >
            <p
              style={{
                fontSize: 16,
                fontWeight: 900,
                margin: 0,
                marginRight: 10,
                padding: 0,
              }}
            >
              cellxgene-ontology
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
            <p style={{ marginLeft: 50 }}>
              Remove nodes if outdegree greater than:
            </p>
            <p>1</p>
            <input
              type="range"
              onChange={this.handleOutdegreeCutoffChange}
              min="1"
              max="5000"
              value={outdegreeCutoffNodes}
              id="changeOutdegreeCutoffNodes"
            />
            <p style={{ marginRight: 50 }}>Max (tbd, 5000)</p>

            {pinnedNode && !isSubset && (
              <button onClick={this.subsetToNode} style={{ marginRight: 10 }}>
                subset to {pinnedNode.id}
              </button>
            )}
            {pinnedNode && isSubset && (
              <button onClick={this.resetSubset} style={{ marginRight: 10 }}>
                reset to whole
              </button>
            )}
            {uberon &&
              majorCompartments.map((compartmentID: string) => {
                const _compartment: any = uberon.get(compartmentID);
                if (_compartment && _compartment.label) {
                  return (
                    <button
                      key={compartmentID}
                      onClick={() => {
                        this.setState({
                          compartment: compartmentID,
                          maxRenderCounter: maxRenderCounter + 1,
                        });
                      }}
                      type="button"
                    >
                      {_compartment.label}
                    </button>
                  );
                } else {
                  return null;
                }
              })}
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
