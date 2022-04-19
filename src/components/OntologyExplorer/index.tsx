import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";

import { drawForceDag, DrawForceDagHighlightProps } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";

import { Ontology, OntologyTerm } from "../../d";

import { useEffectDebugger } from "../../util/useEffectDebugger";

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
  subtreeRootID: string | null;
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
  subtreeRootID: null,
  sugiyamaRenderThreshold: 49,
  cardWidth: 350,
  cardHeight: 850, // 850 default, 2000 full
  menubarHeight: 50,
};

export default function OntologyExplorer({ ontology, lattice, uberon }: OntologyExplorerProps): JSX.Element {
  const [state, setState] = useState<OntologyExplorerState>(defaultState);
  const [hoverNode, setHoverNode] = useState<OntologyVertexDatum>();
  // const [pinnedNode, setPinnedNode] = useState<OntologyVertexDatum>();
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [dagState, setDagState] = useState<DagState | null>(null);
  const [forceCanvasHighlightProps, setForceCanvasHighlightProps] =
    useState<DrawForceDagHighlightProps>(defaultForceHightlightProps);
  const [redrawCanvas, setRedrawCanvas] = useState<((p?: DrawForceDagHighlightProps) => void) | null>(null);

  const { vertexID: pinnedVertexID } = useParams();
  const navigate = useNavigate();
  // const pinnedNode = dagState?.nodes.find((n) => n.id === selectedVertexID);
  console.log(pinnedVertexID);

  const forceCanvasProps = defaultForceCanvasProps;
  const dagCanvasRef = useRef<HTMLCanvasElement>(null);

  const { subtreeRootID, dagCreateProps, cardWidth, cardHeight, menubarHeight, sugiyamaRenderThreshold } = state;

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
      console.log("creating drawForceDag");
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
        (node?: OntologyVertexDatum) => setHoverNode(node),
        // (node?: OntologyVertexDatum) => setPinnedNode(node),
        (node?: OntologyVertexDatum) => navigate(`../${node?.id ?? ""}`),
        () => setSimulationRunning(false),
        lattice,
        defaultForceHightlightProps
      );
      setRedrawCanvas(() => _redrawCanvas);
      setSimulationRunning(() => true);
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
  // const pinnedVertex: OntologyTerm | undefined = pinnedNode && ontology.get(pinnedNode.id);
  const pinnedVertex: OntologyTerm | undefined =
    pinnedVertexID !== undefined ? ontology.get(pinnedVertexID) : undefined;

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
    if (!pinnedVertexID) {
      console.log("in subsetToNode, there was no pinned node");
      return null;
    }
    setState((s) => ({ ...s, subtreeRootID: pinnedVertexID }));
  };

  // XXX fix me - navigate to
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
        pinnedVertex={pinnedVertex}
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
            {!pinnedVertex && hoverVertex && <Vertex ontology={ontology} vertex={hoverVertex} lattice={lattice} />}
            {pinnedVertex && <Vertex ontology={ontology} vertex={pinnedVertex} lattice={lattice} />}
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
