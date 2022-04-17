import { useState, useEffect, useRef } from "react";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";

import { drawForceDag, DrawForceDagHighlightProps } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";

import { Ontology, OntologyTerm } from "../../d";

export interface OntologyVertexDatum extends SimulationNodeDatum {
  id: string;
  ancestorCount: number;
  descendantCount: number;
  n_cells?: number;
}

export interface OntologyExplorerProps {
  ontology: Ontology;
  lattice: Ontology;
  uberon: Ontology;
}

// state related to creating the DAG
interface CreateDagProps {
  minimumOutdegree: number /* max descendants */;
  maximumOutdegree: number;
  outdegreeCutoffXYZ: number /* max descendants */;
  doCreateSugiyamaDatastructure: boolean;
}

// state related to the current DAG
interface DagState {
  nodes: OntologyVertexDatum[];
  links: SimulationLinkDatum<any>[];
  sugiyamaStratifyData: any;
  filteredOutNodes: string[];
}

// state related to the creation of the force-graph
interface ForceCanvasProps {
  forceCanvasWidth: number;
  forceCanvasHeight: number;
  scaleFactor: number;
  translateCenter: number;
}

// Other DAG exploration state
interface OntologyExplorerState {
  dagCreateProps: CreateDagProps;
  hoverNode: OntologyVertexDatum | undefined /* from d3 force node hover */;
  pinnedNode: OntologyVertexDatum | undefined /* from d3 force node click */;
  subtreeRootID: string | null;
  simulationRunning: boolean;
  sugiyamaRenderThreshold: number;
  cardWidth: number;
  cardHeight: number;
  menubarHeight: number;
}

const defaultForceCanvasProps: ForceCanvasProps = {
  forceCanvasWidth: 850,
  forceCanvasHeight: 850,
  scaleFactor: 0.165,
  translateCenter: -350,
};

const defaultForceHightlightProps: DrawForceDagHighlightProps = {
  hullsEnabled: false,
  highlightAncestors: false,
  showTabulaSapiensDataset: false,
  compartment: undefined,
};

const defaultState: OntologyExplorerState = {
  dagCreateProps: {
    minimumOutdegree: 3, // for filter nodes
    maximumOutdegree: 12345,
    outdegreeCutoffXYZ: 50,
    doCreateSugiyamaDatastructure: true,
  },
  hoverNode: undefined,
  pinnedNode: undefined,
  subtreeRootID: null,
  simulationRunning: false,
  sugiyamaRenderThreshold: 49,
  cardWidth: 350,
  cardHeight: 850, // 850 default, 2000 full
  menubarHeight: 50,
};

export default function OntologyExplorer({ ontology, lattice, uberon }: OntologyExplorerProps): JSX.Element {
  const [state, setState] = useState<OntologyExplorerState>(defaultState);
  const [dagState, setDagState] = useState<DagState | null>(null);
  const [forceCanvasHighlightProps, setForceCanvasHighlightProps] =
    useState<DrawForceDagHighlightProps>(defaultForceHightlightProps);
  const [redrawCanvas, setRedrawCanvas] = useState<((p?: DrawForceDagHighlightProps) => void) | null>(null);

  const forceCanvasProps = defaultForceCanvasProps;
  const dagCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    subtreeRootID,
    dagCreateProps,
    pinnedNode,
    hoverNode,
    simulationRunning,
    cardWidth,
    cardHeight,
    menubarHeight,
    sugiyamaRenderThreshold,
  } = state;

  useEffect(() => {
    /*
    Rebuild the DAG rendering elements whenever one of the following change:
      - the ontology
      - the root note
      - parameters that affect the choice of nodes or their connectivity, eg, minimumOutdegree

    Side effect: sets the DAG state.
    */
    setDagState(createDag(ontology, subtreeRootID, dagCreateProps));
  }, [subtreeRootID, ontology, dagCreateProps]);

  useEffect(() => {
    /*
    Rebuild the renderer and simulation whenever inputs to the sim change.

    Side effect: sets the render & simulation state.
    */
    if (dagState) {
      const { nodes, links } = dagState;
      const { forceCanvasWidth, forceCanvasHeight, scaleFactor, translateCenter } = forceCanvasProps;
      const _redrawCanvas = drawForceDag(
        nodes,
        links,
        forceCanvasWidth,
        forceCanvasHeight,
        scaleFactor,
        translateCenter,
        dagCanvasRef,
        ontology,
        (node?: OntologyVertexDatum) => {
          setState((s) => ({ ...s, hoverNode: node }));
        },
        (node?: OntologyVertexDatum) => {
          setState((s) => ({ ...s, pinnedNode: node }));
        },
        () => {
          setState((s) => ({ ...s, simulationRunning: false }));
        },
        lattice,
        defaultForceHightlightProps
      );
      setRedrawCanvas(() => _redrawCanvas);
      setState((s) => ({ ...s, simulationRunning: true }));
    }
  }, [ontology, lattice, dagState, dagCanvasRef, forceCanvasProps]);

  useEffect(() => {
    /*
    Redraw the DAG whenever highlight state changes.
    */
    if (redrawCanvas && !simulationRunning) {
      redrawCanvas(forceCanvasHighlightProps);
    }
  }, [redrawCanvas, forceCanvasHighlightProps, simulationRunning]);

  const hoverVertex: OntologyTerm | undefined = hoverNode && ontology.get(hoverNode.id);
  const pinnedVertex: OntologyTerm | undefined = pinnedNode && ontology.get(pinnedNode.id);

  const { minimumOutdegree, maximumOutdegree } = dagCreateProps;
  const { forceCanvasWidth, forceCanvasHeight } = forceCanvasProps;
  const isSubset = !!subtreeRootID;
  const { searchString, hullsEnabled, highlightAncestors, showTabulaSapiensDataset } = forceCanvasHighlightProps;

  /*
   * Callbacks
   */
  const handleHighlightAncestorChange = () =>
    setForceCanvasHighlightProps((s) => ({
      ...s,
      highlightAncestors: !s.highlightAncestors,
    }));

  const handleHullChange = () =>
    setForceCanvasHighlightProps((s) => ({
      ...s,
      hullsEnabled: !s.hullsEnabled,
    }));

  const handleShowTabulaSapiensChange = () =>
    setForceCanvasHighlightProps((s) => ({
      ...s,
      showTabulaSapiensDataset: !s.showTabulaSapiensDataset,
    }));

  /**
   * @param e is a react synthetic event type, todo
   */
  const handleSearchStringChange = (e: any) =>
    setForceCanvasHighlightProps((s) => ({ ...s, searchString: e.target.value }));

  const subsetToNode = () => {
    if (!pinnedNode?.id) {
      console.log("in subsetToNode, there was no pinned node");
      return null;
    }
    setState((s) => ({ ...s, subtreeRootID: pinnedNode.id }));
  };

  const resetSubset = () => setState((s) => ({ ...s, pinnedNode: undefined, subtreeRootID: null }));

  const handleMinOutdegreeChange = (e: any) =>
    // TODO: param typing
    setState((s) => ({
      ...s,
      dagCreateProps: {
        ...s.dagCreateProps,
        minimumOutdegree: +e.target.value,
      },
    }));

  const setCompartment = (compartment: { uberonID: string; label: string }) =>
    setForceCanvasHighlightProps((s) => ({ ...s, compartment: compartment.uberonID }));

  return (
    <div id="ontologyExplorerContainer">
      <Controls
        pinnedNode={pinnedNode}
        dagSearchText={searchString ?? ""}
        simulationRunning={simulationRunning}
        menubarHeight={menubarHeight}
        isSubset={isSubset}
        outdegreeCutoffNodes={minimumOutdegree}
        uberon={uberon}
        handleDagSearchChange={handleSearchStringChange}
        subsetToNode={subsetToNode}
        handleMinOutdegreeChange={handleMinOutdegreeChange}
        resetSubset={resetSubset}
        setCompartment={setCompartment}
        hullsEnabled={!!hullsEnabled}
        handleHullChange={handleHullChange}
        highlightAncestors={!!highlightAncestors}
        handleHighlightAncestorChange={handleHighlightAncestorChange}
        showTabulaSapiensDataset={!!showTabulaSapiensDataset}
        handleShowTabulaSapiensChange={handleShowTabulaSapiensChange}
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
            margin: 0,
          }}
        >
          <div id="innerDivToPreventPaddingSizeIncrease" style={{ padding: 10 }}>
            {/**
             * Render cards
             */}
            {!pinnedNode && hoverNode && (
              <Vertex ontology={ontology} vertex={hoverVertex} vertexID={hoverNode && hoverNode.id} lattice={lattice} />
            )}
            {pinnedNode && (
              <Vertex
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
          ref={dagCanvasRef}
        />
        {/**
         * Render sugiyama
         */}
        {dagState?.sugiyamaStratifyData && dagState?.sugiyamaStratifyData.length < sugiyamaRenderThreshold && (
          <div
            style={{
              position: "absolute",
              top: menubarHeight,
              left: cardWidth + forceCanvasWidth,
            }}
          >
            <Sugiyama sugiyamaStratifyData={dagState.sugiyamaStratifyData} ontology={ontology} />
          </div>
        )}
      </div>
    </div>
  );
}

function createDag(ontology: Ontology, subtreeRootID: string | null, options: CreateDagProps) {
  const { minimumOutdegree, maximumOutdegree, outdegreeCutoffXYZ, doCreateSugiyamaDatastructure } = options;

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
   *
   * TODO: XXX - cleanup needed
   */
  ontology.forEach((v: any, id) => {
    const nonhuman =
      v.label.includes("Mus musculus") || // mouse
      v.label.includes("conidium") || //fungus
      v.label.includes("fungal") ||
      v.label.includes("Fungi") ||
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

    const doFilterNodesWithoutNCounts = false;

    /* make this a control / toggle */
    if (!v.n_cells && doFilterNodesWithoutNCounts) {
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
    return { nodes, links, filteredOutNodes, sugiyamaStratifyData };
  }

  const { nodes, links, sugiyamaStratifyData } = createNodesLinksHulls(
    ontology,
    filteredOutNodes, // get rid of stuff!
    outdegreeCutoffXYZ, // remove xyz
    doCreateSugiyamaDatastructure
  );
  return { nodes, links, filteredOutNodes, sugiyamaStratifyData };
}
