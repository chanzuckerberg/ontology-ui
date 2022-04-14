import React, { createRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";

import { drawForceDag } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";

// import { ILatticeOntology, IOntology, IVertex } from "../../d";
import { Ontology, OntologyTerm } from "../../d";

export interface OntologyVertexDatum extends SimulationNodeDatum {
  id: string;
  ancestorCount: number;
  descendantCount: number;
}

interface IProps {
  ontologyName: string;
  ontology: Ontology;
  lattice: Ontology;
  uberon: Ontology;
}

interface IState {
  nodes: OntologyVertexDatum[] | null;
  links: SimulationLinkDatum<any>[] | null;
  sugiyamaStratifyData: any;
  forceCanvasWidth: number;
  forceCanvasHeight: number;
  scaleFactor: number;
  translateCenter: number;
  hoverNode: OntologyVertexDatum | undefined /* from d3 force node hover */;
  pinnedNode: OntologyVertexDatum | undefined /* from d3 force node click */;
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
  doCreateSugiyamaDatastructure: boolean;
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
      hoverNode: undefined,
      pinnedNode: undefined,
      highlightAncestors: false,
      compartment: null,
      canvasRenderCounter: 0,
      dagSearchText: "",
      subtreeRootID: null,
      isSubset: false,
      redrawCanvas: null,
      simulationRunning: false,
      minimumOutdegree: 0, // for filter nodes
      maximumOutdegree: 12345,
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
      doCreateSugiyamaDatastructure: true,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    this.createDag();
  }

  createDag = (subtreeRootID?: string) => {
    const { ontology } = this.props;
    const {
      minimumOutdegree,
      maximumOutdegree,
      outdegreeCutoffXYZ,
      doCreateSugiyamaDatastructure,
    } = this.state;

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

      if (
        v.descendants.length > maximumOutdegree || // more than n descendants ... sometimes we want to remove the nodes, sometimes we want to xyz the links
        v.descendants.length < minimumOutdegree || // remove nodes with less than n descendants ... sometimes we want to start at cell and show the big stuff only
        // v.descendants.length === 0 || // zero descendants
        nonhuman
        // bigTroublesomeMetadataCells
      ) {
        filteredOutNodes.push(id);
      }

      /* make this a control / toggle */
      if (!v.n_cells && false) {
        filteredOutNodes.push(id);
      }
    });

    if (subtreeRootID) {
      const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
        ontology,
        filteredOutNodes, // get rid of stuff!
        outdegreeCutoffXYZ,
        doCreateSugiyamaDatastructure,
        uniqueSubtreeFromRootNode // include only this stuff!
      );
      this.setState({ nodes, links, filteredOutNodes, sugiyamaStratifyData });
    } else {
      const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
        ontology,
        filteredOutNodes, // get rid of stuff!
        outdegreeCutoffXYZ, // remove xyz
        doCreateSugiyamaDatastructure
      );
      this.setState({ nodes, links, filteredOutNodes, sugiyamaStratifyData });
    }
  };

  initializeCanvasRenderer = (
    nodes: OntologyVertexDatum[],
    links: SimulationLinkDatum<any>[],
    ontology: Ontology
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
      lattice,
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
      maximumOutdegree,
      hullsEnabled,
      highlightAncestors,
      showTabulaSapiensDataset,
    } = this.state;

    const hoverVertex: OntologyTerm | undefined =
      hoverNode && ontology.get(hoverNode.id);

    const pinnedVertex: OntologyTerm | undefined =
      pinnedNode && ontology.get(pinnedNode.id);

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
          maximumOutdegree={maximumOutdegree + ""}
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
                  vertex={hoverVertex}
                  vertexID={hoverNode && hoverNode.id}
                  lattice={lattice}
                />
              )}
              {pinnedNode && (
                <Vertex
                  ontologyName={ontologyName}
                  ontology={ontology}
                  vertex={pinnedVertex}
                  vertexID={pinnedNode && pinnedNode.id}
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
              width: forceCanvasWidth, // scale back down with css if we scaled up for retina
              height: forceCanvasHeight,
            }}
            width={forceCanvasWidth * window.devicePixelRatio} // scale up canvas for retina
            height={forceCanvasHeight * window.devicePixelRatio}
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
  setHoverNode = (node: OntologyVertexDatum | undefined) => {
    this.setState({ hoverNode: node });
  };
  setPinnedNode = (node: OntologyVertexDatum | undefined) => {
    this.setState({ pinnedNode: node });
  };

  setCompartment = (compartment: { uberonID: string; label: string }) => {
    const { maxRenderCounter } = this.state;
    console.log("comp", compartment);
    this.setState({
      compartment: compartment.uberonID,
      maxRenderCounter: maxRenderCounter + 1,
    });
  };

  subsetToNode = () => {
    const { pinnedNode, maxRenderCounter } = this.state;

    if (!pinnedNode || !pinnedNode.id) {
      console.log("in subsetToNode, there was no pinned node");
      return null;
    }
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
      pinnedNode: undefined,
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
