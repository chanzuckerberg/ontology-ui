import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";

import { drawForceDag } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";

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
  highlightAncestors: boolean;
  compartment: string | null;
  canvasRenderCounter: number;
  dagSearchText: string;
  subtreeRootID: string | null;
  isSubset: boolean;
  redrawCanvas: any /* function to force render canvas */;
  simulationRunning: boolean;
  minimumOutdegree: number /* max descendants */;
  maximumOutdegree: number;
  outdegreeCutoffXYZ: number /* max descendants */;
  filteredOutNodes: string[];
  hullsEnabled: boolean;
  maxRenderCounter: number;
  sugiyamaRenderThreshold: number;
  cardWidth: number;
  cardHeight: number;
  menubarHeight: number;
  showTabulaSapiensDataset: boolean;
}

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      nodes: null,
      links: null,
      sugiyamaStratifyData: null,
      scaleFactor: 0.165,
      translateCenter: -350,
      hoverNode: null,
      pinnedNode: null,
      highlightAncestors: false,
      compartment: null,
      canvasRenderCounter: 0,
      dagSearchText: "",
      subtreeRootID: null,
      isSubset: false,
      redrawCanvas: null,
      simulationRunning: false,
      minimumOutdegree: 3, // for filter nodes
      maximumOutdegree: 100000,
      outdegreeCutoffXYZ: 50,
      filteredOutNodes: [],
      hullsEnabled: false,
      maxRenderCounter: 1,
      sugiyamaRenderThreshold: 49,
      forceCanvasWidth: 850,
      forceCanvasHeight: 850,
      cardWidth: 350,
      cardHeight: 850, // 850 default, 2000 full
      menubarHeight: 50,
      showTabulaSapiensDataset: false,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    this.createDag();
  }

  createDag = (subtreeRootID?: string) => {
    const { ontology } = this.props;
    const { minimumOutdegree, maximumOutdegree, outdegreeCutoffXYZ } =
      this.state;

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
      const nonhuman =
        v.label.includes("Mus musculus") || // mouse
        v.label.includes("conidium") || //fungus
        v.label.includes("fungal") ||
        v.label.includes("spore");

      const bigTroublesomeMetadataCells = // unify the above with this list
        id === "CL:0000988" || // hematopoietic cell
        id === "CL:0000393" || // electrically active
        id === "CL:0000219" || // motile cell
        id === "CL:0002371" || // somatic cell
        id === "CL:0000066" || // epithelial cell
        id === "CL:0000000" || // cell
        id === "CL:0000325" || // stuff accumulating cell
        id === "CL:0000151" || // secratory cell
        id === "CL:0000548" || // animal cell
        id === "CL:0000234" || // phagocyte
        id === "CL:0002319" || // neural cell
        id === "CL:0000003"; // native cell

      if (
        v.descendants.length > maximumOutdegree || // more than n descendants ... sometimes we want to remove the nodes, sometimes we want to xyz the links
        v.descendants.length < minimumOutdegree || // remove nodes with less than n descendants ... sometimes we want to start at cell and show the big stuff only
        // v.descendants.length === 0 || // zero descendants
        nonhuman
        // bigTroublesomeMetadataCells
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
      hullsEnabled,
      compartment,
      highlightAncestors,
      showTabulaSapiensDataset,
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
      hullsEnabled,
      _latticeCL,
      compartment,
      highlightAncestors,
      showTabulaSapiensDataset
    );

    this.setState({ redrawCanvas, simulationRunning: true });
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
      minimumOutdegree,
      hullsEnabled,
      highlightAncestors,
      showTabulaSapiensDataset,
    } = this.state;

    return (
      <div id="ontologyExplorerContainer">
        <Controls
          pinnedNode={pinnedNode}
          dagSearchText={dagSearchText}
          simulationRunning={simulationRunning}
          menubarHeight={menubarHeight}
          isSubset={isSubset}
          outdegreeCutoffNodes={minimumOutdegree}
          uberon={uberon}
          handleDagSearchChange={this.handleDagSearchChange}
          subsetToNode={this.subsetToNode}
          handleMinOutdegreeChange={this.handleMinOutdegreeChange}
          resetSubset={this.resetSubset}
          setCompartment={this.setCompartment}
          hullsEnabled={hullsEnabled}
          handleHullChange={this.handleHullChange}
          highlightAncestors={highlightAncestors}
          handleHighlightAncestorChange={this.handleHighlightAncestorChange}
          showTabulaSapiensDataset={showTabulaSapiensDataset}
          handleShowTabulaSapiensChange={this.handleShowTabulaSapiensChange}
          minimumOutdegree={minimumOutdegree + ""}
        />
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
              cursor: "crosshair",
              border: "1px solid green",
              width: forceCanvasWidth,
              height: forceCanvasHeight,
            }}
            width={forceCanvasWidth * 2}
            height={forceCanvasHeight * 2}
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

  handleHullChange = (e: any) => {
    const { hullsEnabled, maxRenderCounter } = this.state;
    this.setState({
      hullsEnabled: !hullsEnabled,
      maxRenderCounter: maxRenderCounter + 1,
    });
  };

  handleHighlightAncestorChange = (e: any) => {
    const { highlightAncestors, maxRenderCounter } = this.state;
    this.setState({
      highlightAncestors: !highlightAncestors,
      maxRenderCounter: maxRenderCounter + 1,
    });
  };
  handleShowTabulaSapiensChange = (e: any) => {
    const { showTabulaSapiensDataset, maxRenderCounter } = this.state;
    this.setState({
      showTabulaSapiensDataset: !showTabulaSapiensDataset,
      maxRenderCounter: maxRenderCounter + 1,
    });
  };
  setHoverNode = (hoverNode: any) => {
    this.setState({ hoverNode });
  };
  setPinnedNode = (pinnedNode: any) => {
    this.setState({ pinnedNode });
  };

  setCompartment = (compartmentID: string) => {
    const { maxRenderCounter } = this.state;

    this.setState({
      compartment: compartmentID,
      maxRenderCounter: maxRenderCounter + 1,
    });
  };

  subsetToNode = () => {
    const { pinnedNode, maxRenderCounter } = this.state;
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

  handleMinOutdegreeChange = (e: any) => {
    const { maxRenderCounter } = this.state;

    this.setState({
      minimumOutdegree: +e.target.value,
      maxRenderCounter: maxRenderCounter + 1,
    });
    this.createDag();
  };
}

export default OntologyExplorer;
