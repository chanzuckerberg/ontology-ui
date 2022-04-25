import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, createSearchParams } from "react-router-dom";
import { useWindowHeight } from "@react-hook/window-size";

import { createNodesLinksHulls } from "../../util/createNodesLinksHulls";
import { drawForceDag, DrawForceDagHighlightProps, NodeHighlight } from "./drawForce";
import Vertex from "../Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";
import { OntologyId, OntologyTerm, OntologyPrefix, DatasetGraph } from "../../d";
import {
  ForceCanvasProps,
  OntologyExplorerState,
  OntologyExplorerProps,
  OntologyVertexDatum,
  DagState,
  CreateDagProps,
} from "./types";
import lruMemoize from "../../util/lruMemo";
import {
  ontologySubDAG,
  ontologyFilter,
  OntologyFilterAction,
  ontologyQuery,
  OntologyQuery,
} from "../../util/ontologyDag";

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
  nodeHighlight: new Map(),
};

const defaultState: OntologyExplorerState = {
  dagCreateProps: {
    minimumOutdegree: 3,
    maximumOutdegree: 12345,
    outdegreeCutoffXYZ: 0,
    doCreateSugiyamaDatastructure: true,
  },
  sugiyamaRenderThreshold: 49,
  cardWidth: 350,
  cardHeight: 850,
};

export default function OntologyExplorer({ graph, omniXref }: OntologyExplorerProps): JSX.Element {
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

  const windowHeight = useWindowHeight();
  const menubarHeight = 50;

  const { dagCreateProps, cardWidth, sugiyamaRenderThreshold } = state;

  /*
  TODO: components should not interact with page-level state such as params and search
  params. All of this should move to a file in ./route/ and be up-leveled.
  */

  /*
   * State passed in the URL:
   *    ontoID (path element): the current ontology prefix
   *    vertexID (path element): the currently selected/pinned vertex
   *    root (query param): subset graph on the IDs returned by the OntologyQuery
   *    match (query param): the free text search within current ontology
   */
  const params = useParams();
  const { vertexID: pinnedVertexID } = params;
  // unknown ontology - just display our default.  TODO - we should show an error?
  const ontoID = params.ontoID && params.ontoID in graph.ontologies ? params.ontoID : "CL";
  const ontology = graph.ontologies[ontoID];

  const searchParamsRef = useSearchParamsRef();
  const root = searchParamsRef.current[0].getAll("root");
  const match = searchParamsRef.current[0].get("match");
  const xref = searchParamsRef.current[0].get("xref");
  const query = searchParamsRef.current[0].toString();

  const forceCanvasProps = defaultForceCanvasProps;
  const dagCanvasRef = useRef<HTMLCanvasElement>(null);

  /*
   * memoized callback to navigate.
   */
  const navigate = useNavigateRef();
  const makeLink = useCallback(
    (path: string = "", query = undefined) => {
      const [searchParams] = searchParamsRef.current;
      query = query || searchParams.toString();
      return path + (query ? "?" + query : "");
    },
    [searchParamsRef]
  );
  const go = useCallback((path: string) => navigate(makeLink(path)), [navigate, makeLink]);

  useEffect(() => {
    /*
    Rebuild the DAG rendering elements whenever one of the following change:
      - the ontology
      - the root node(s)
      - parameters that affect the choice of nodes or their connectivity, eg, minimumOutdegree
    Side effect: sets the DAG state.
    */
    setDagState(createDag(graph, ontoID, root, dagCreateProps));
  }, [root, graph, ontoID, dagCreateProps]);

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
        defaultForceHightlightProps
      );
      setRedrawCanvas(() => _redrawCanvas);
      setSimulationRunning(() => true);
    }
  }, [ontology, dagState, dagCanvasRef, forceCanvasProps, go]);

  useEffect(() => {
    /*
    Redraw the DAG whenever highlight state changes.
    */
    if (redrawCanvas) {
      const nodeHighlight = new Map<string, NodeHighlight>();
      if (xref) {
        for (const id of ontologyQuery(graph.ontologies, ontoID, JSON.parse(xref))) {
          nodeHighlight.set(id, "secondary");
        }
      }
      if (match) {
        for (const id of ontologyQuery(graph.ontologies, ontoID, { $match: match })) {
          nodeHighlight.set(id, "primary");
        }
      }
      if (pinnedVertexID) nodeHighlight.set(pinnedVertexID, "pinned");
      const highlights = {
        ...forceCanvasHighlightProps,
        nodeHighlight,
      };
      redrawCanvas(highlights);
    }
  }, [redrawCanvas, forceCanvasHighlightProps, pinnedVertexID, ontoID, match, xref, graph.ontologies]);

  const hoverVertex: OntologyTerm | undefined = hoverNode && ontology.get(hoverNode.id);
  const pinnedVertex: OntologyTerm | undefined =
    pinnedVertexID !== undefined ? ontology.get(pinnedVertexID) : undefined;

  const { minimumOutdegree, maximumOutdegree } = dagCreateProps;
  const { forceCanvasWidth, forceCanvasHeight } = forceCanvasProps;
  const isSubset = root.length > 0;
  const { hullsEnabled, highlightAncestors } = forceCanvasHighlightProps;

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
    if (val) searchParams.set("match", val);
    else searchParams.delete("match");
    setSearchParams(searchParams);
  };

  const updateXref = useCallback(
    (xrefID: OntologyId) => {
      const [searchParams] = searchParamsRef.current;
      const newSearchParams = createSearchParams(searchParams); // clone
      if (xrefID) {
        const ids = [...ontologyQuery(graph.ontologies, ontoID, { $walk: xrefID, $via: "part_of" })];
        const query: OntologyQuery = {
          $joinOn: "*",
          $where: ids,
        };
        newSearchParams.set("xref", JSON.stringify(query));
      } else {
        newSearchParams.delete("xref");
      }
      return newSearchParams;
    },
    [searchParamsRef, graph.ontologies, ontoID]
  );

  const setXrefSearch = (term: { xrefID: string; label: string }) => {
    const [, setSearchParams] = searchParamsRef.current;
    const searchParams = updateXref(term.xrefID);
    setSearchParams(searchParams); // will navigate
  };

  const makeLsbTo = useCallback(
    (id: OntologyId): string => {
      if (id.split(":", 1)[0] === ontoID) {
        return makeLink(`../${id}`);
      } else {
        return makeLink("", updateXref(id));
      }
    },
    [ontoID, makeLink, updateXref]
  );

  const subsetToNode = () => {
    if (!pinnedVertexID) {
      console.log("in subsetToNode, there was no pinned node");
      return null;
    }
    const [searchParams, setSearchParams] = searchParamsRef.current;
    // NOTE: root query param can accept more than one root. This UI
    // uses `.set()`, which clobbers any existing value, restricting to
    // a single root in practice. Use `append()` OR set the param to
    // a OntologySearch if you want to _add_ a new root rather than
    // replace the existing root.
    searchParams.set("root", pinnedVertexID);
    setSearchParams(searchParams);
  };

  const resetSubset = () => {
    const [searchParams, setSearchParams] = searchParamsRef.current;
    searchParams.delete("root");
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

  const deselectPinnedVertex = () => {
    if (pinnedVertexID) {
      go("../");
    }
  };

  return (
    <div id="ontologyExplorerContainer">
      <Controls
        pinnedVertex={pinnedVertex}
        dagSearchText={match ?? ""}
        simulationRunning={simulationRunning}
        menubarHeight={menubarHeight}
        isSubset={isSubset}
        outdegreeCutoffNodes={minimumOutdegree}
        omniXref={omniXref}
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
        minimumOutdegree={minimumOutdegree + ""}
        maximumOutdegree={maximumOutdegree + ""}
      />
      <div id="horizontalScroll">
        <div
          id="card"
          style={{
            width: cardWidth,
            height: windowHeight - menubarHeight - 16,
            overflow: "scroll",
            margin: 0,
          }}
        >
          <div id="innerDivToPreventPaddingSizeIncrease" style={{ padding: 10 }}>
            {/**
             * Render cards
             */}
            {!pinnedVertex && hoverVertex && (
              <Vertex graph={graph} vertex={hoverVertex} query={query} makeTo={(id: OntologyId) => makeLsbTo(id)} />
            )}
            {pinnedVertex && (
              <Vertex graph={graph} vertex={pinnedVertex} query={query} makeTo={(id: OntologyId) => makeLsbTo(id)} />
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

/**
 * Memoize createDag
 */
const createDag = lruMemoize(_createDag, _createDagHash, -1);

function _createDagHash(
  graph: DatasetGraph,
  ontoID: OntologyPrefix,
  rootIdQuery: string[],
  options: CreateDagProps
): string {
  return "" + ontoID + rootIdQuery.join("&") + JSON.stringify(options);
}

function _createDag(
  graph: DatasetGraph,
  ontoID: OntologyPrefix,
  rootIdQuery: string[],
  options: CreateDagProps
): DagState {
  console.time("createDag");
  const { minimumOutdegree, maximumOutdegree, doCreateSugiyamaDatastructure } = options;

  let ontology = graph.ontologies[ontoID];
  if (rootIdQuery) {
    const ids = new Set<OntologyId>();
    for (const query of rootIdQuery) {
      const queryResult = ontologyQuery(graph.ontologies, ontoID, JSON.parse(query));
      for (const id of queryResult) {
        ids.add(id);
      }
    }
    if (ids.size > 0) {
      ontology = ontologySubDAG(ontology, [...ids]);
    }
  }
  console.timeLog("createDag", "Root ID query");

  // Don't bother with the filter if we are down to small number, as this leads to weird graphs
  // with missing nodes, etc.
  if (ontology.size > 1) {
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
  }
  console.timeLog("createDag", "Term filter");

  const result = createNodesLinksHulls(ontology, doCreateSugiyamaDatastructure);
  console.timeEnd("createDag");
  return result;
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
