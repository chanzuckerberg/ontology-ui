import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";
import { drawForceDag, DrawForceDagHighlightProps } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";
import { Ontology, OntologyTerm } from "../../d";
import {
  ForceCanvasProps,
  OntologyExplorerState,
  OntologyExplorerProps,
  OntologyVertexDatum,
  DagState,
  CreateDagProps,
} from "./types";
import lruMemoize from "../../util/lruMemo";
import { ontologySubDAG, ontologyFilter, OntologyFilterAction } from "../../util/ontologyDag";

import { useNavigateRef } from "../useNavigateRef";

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
  xrefTermID: undefined,
  searchString: undefined,
};

const defaultState: OntologyExplorerState = {
  dagCreateProps: {
    minimumOutdegree: 3, // for filter nodes
    maximumOutdegree: 12345,
    outdegreeCutoffXYZ: 50,
    doCreateSugiyamaDatastructure: true,
  },
  sugiyamaRenderThreshold: 49,
  cardWidth: 350,
  cardHeight: 850, // 850 default, 2000 full
  menubarHeight: 50,
};

export default function OntologyExplorer({ ontology, lattice, xref }: OntologyExplorerProps): JSX.Element {
  /*
   * Component internal state
   */
  const [state, setState] = useState<OntologyExplorerState>(defaultState);
  const [hoverNode, setHoverNode] = useState<OntologyVertexDatum>();
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [dagState, setDagState] = useState<DagState | null>(null);
  const [forceCanvasHighlightProps, setForceCanvasHighlightProps] =
    useState<DrawForceDagHighlightProps>(defaultForceHightlightProps);
  const [redrawCanvas, setRedrawCanvas] = useState<((p?: DrawForceDagHighlightProps) => void) | null>(null);

  const { dagCreateProps, cardWidth, cardHeight, menubarHeight, sugiyamaRenderThreshold } = state;

  /*
   * State passed in the browser history:
   *    vertexID (path element): the currently selected/pinned vertex
   *    subtreeRootID (query param): subset graph on the currently selected vertex
   *    seachString (query param): the free text search within current ontology
   */
  const { vertexID: pinnedVertexID } = useParams();
  const searchParamsRef = useSearchParamsRef();
  const subtreeRootID = searchParamsRef.current[0].get("subtreeRootID");
  const searchString = searchParamsRef.current[0].get("searchString");
  const query = searchParamsRef.current[0].toString();

  const forceCanvasProps = defaultForceCanvasProps;
  const dagCanvasRef = useRef<HTMLCanvasElement>(null);

  /*
   * memoized callback to navigate.
   */
  const navigate = useNavigateRef();
  const go = useCallback(
    (path: string = "") => {
      const [searchParams] = searchParamsRef.current;
      const query = searchParams.toString();
      navigate(path + (query ? "?" + query : ""));
    },
    [navigate, searchParamsRef]
  );

  useEffect(() => {
    /*
    Rebuild the DAG rendering elements whenever one of the following change:
      - the ontology
      - the root node
      - parameters that affect the choice of nodes or their connectivity, eg, minimumOutdegree
    Side effect: sets the DAG state.
    */
    setDagState(createDag(ontology, subtreeRootID, dagCreateProps));
  }, [subtreeRootID, ontology, dagCreateProps]);

  useEffect(() => {
    /*
    Rebuild the renderer and simulation-driven layout whenever inputs to the sim change.

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
        (node?: OntologyVertexDatum) => setHoverNode(node),
        (node?: OntologyVertexDatum) => go(`../${node?.id ?? ""}`),
        () => setSimulationRunning(false),
        lattice,
        defaultForceHightlightProps
      );
      setRedrawCanvas(() => _redrawCanvas);
      setSimulationRunning(() => true);
    }
  }, [ontology, lattice, dagState, dagCanvasRef, forceCanvasProps, go]);

  useEffect(() => {
    /*
    Redraw the DAG whenever highlight state changes.
    */
    if (redrawCanvas) {
      const highlights = {
        ...forceCanvasHighlightProps,
        pinnedNodeID: pinnedVertexID ?? "",
        searchString: searchString ?? undefined,
      };
      redrawCanvas(highlights);
    }
  }, [redrawCanvas, forceCanvasHighlightProps, pinnedVertexID, searchString]);

  const hoverVertex: OntologyTerm | undefined = hoverNode && ontology.get(hoverNode.id);
  const pinnedVertex: OntologyTerm | undefined =
    pinnedVertexID !== undefined ? ontology.get(pinnedVertexID) : undefined;

  const { minimumOutdegree, maximumOutdegree } = dagCreateProps;
  const { forceCanvasWidth, forceCanvasHeight } = forceCanvasProps;
  const isSubset = !!subtreeRootID;
  const { hullsEnabled, highlightAncestors, showTabulaSapiensDataset } = forceCanvasHighlightProps;

  /*
   * Controls callbacks
   */
  const onHighlightToggle = (highlightKey: keyof DrawForceDagHighlightProps) => () =>
    setForceCanvasHighlightProps((s) => ({
      ...s,
      [highlightKey]: !s[highlightKey],
    }));

  const handleSearchStringChange = (e: any) => {
    // TODO: param typing
    const [searchParams, setSearchParams] = searchParamsRef.current;
    const val = e.target.value;
    if (val) searchParams.set("searchString", val);
    else searchParams.delete("searchString");
    setSearchParams(searchParams);
  };

  const subsetToNode = () => {
    if (!pinnedVertexID) {
      console.log("in subsetToNode, there was no pinned node");
      return null;
    }
    const [searchParams, setSearchParams] = searchParamsRef.current;
    searchParams.set("subtreeRootID", pinnedVertexID);
    setSearchParams(searchParams);
  };

  const resetSubset = () => {
    const [searchParams, setSearchParams] = searchParamsRef.current;
    searchParams.delete("subtreeRootID");
    setSearchParams(searchParams);
  };

  const handleMinOutdegreeChange = (e: any) =>
    // TODO: param typing
    setState((s) => ({
      ...s,
      dagCreateProps: {
        ...s.dagCreateProps,
        minimumOutdegree: +e.target.value,
      },
    }));

  const setXrefSearch = (term: { xrefID: string; label: string }) =>
    setForceCanvasHighlightProps((s) => ({ ...s, xrefTermID: term.xrefID }));

  const deselectPinnedVertex = () => {
    if (pinnedVertexID) {
      go("../");
    }
  };

  return (
    <div id="ontologyExplorerContainer">
      <Controls
        pinnedVertex={pinnedVertex}
        dagSearchText={searchString ?? ""}
        simulationRunning={simulationRunning}
        menubarHeight={menubarHeight}
        isSubset={isSubset}
        outdegreeCutoffNodes={minimumOutdegree}
        xref={xref}
        handleDagSearchChange={handleSearchStringChange}
        deselectPinnedNode={deselectPinnedVertex}
        subsetToNode={subsetToNode}
        handleMinOutdegreeChange={handleMinOutdegreeChange}
        resetSubset={resetSubset}
        setXrefSearch={setXrefSearch}
        hullsEnabled={!!hullsEnabled}
        handleHullChange={onHighlightToggle("hullsEnabled")}
        highlightAncestors={!!highlightAncestors}
        handleHighlightAncestorChange={onHighlightToggle("highlightAncestors")}
        showTabulaSapiensDataset={!!showTabulaSapiensDataset}
        handleShowTabulaSapiensChange={onHighlightToggle("showTabulaSapiensDataset")}
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
            {!pinnedVertex && hoverVertex && (
              <Vertex ontology={ontology} vertex={hoverVertex} lattice={lattice} query={query} />
            )}
            {pinnedVertex && <Vertex ontology={ontology} vertex={pinnedVertex} lattice={lattice} query={query} />}
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

/**
 * Memoize createDag
 */
const createDag = lruMemoize(_createDag, _createDagHash, -1);

function _createDagHash(ontology: Ontology, subtreeRootID: string | null, options: CreateDagProps) {
  const ontologyPrefix = ontology.keys().next().value;
  return "" + ontologyPrefix + subtreeRootID + JSON.stringify(options);
}

function _createDag(ontology: Ontology, subtreeRootID: string | null, options: CreateDagProps) {
  const { minimumOutdegree, maximumOutdegree, doCreateSugiyamaDatastructure } = options;

  if (subtreeRootID) {
    ontology = ontologySubDAG(ontology, subtreeRootID);
  }

  ontology = ontologyFilter(ontology, (term: OntologyTerm) => {
    const { label, in_use } = term;

    const n_cells = term?.n_cells ?? 0;
    if (in_use || n_cells > 0) return OntologyFilterAction.Retain;

    // TODO: this will eventually move to graph builder, and out of front-end
    const nonhumanTerm =
      label.includes("Mus musculus") || // mouse
      label.includes("conidium") || //fungus
      label.includes("sensu Nematoda and Protostomia") ||
      label.includes("sensu Endopterygota") ||
      label.includes("fungal") ||
      label.includes("Fungi") ||
      label.includes("spore");
    const orphanTerm = !n_cells && term.descendants.size === 0 && term.ancestors.size === 0;
    const nChildren = term.children.length;

    if (nonhumanTerm || orphanTerm || nChildren < minimumOutdegree || nChildren > maximumOutdegree) {
      return OntologyFilterAction.RemoveFamily;
    }

    return OntologyFilterAction.Retain;
  });

  return createNodesLinksHulls(ontology, doCreateSugiyamaDatastructure);
}

/**
 * Hook to create a reference to the current search param state.
 * This allows search params to be referenced in an effect, without
 * causing the effect to be re-run each time we render.
 *
 * @returns Ref to the search param state
 */
function useSearchParamsRef() {
  const sp = useSearchParams();
  const searchParamsRef = useRef(sp);
  searchParamsRef.current = sp;
  return searchParamsRef;
}
