import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useParams, useSearchParams, createSearchParams } from "react-router-dom";
import { useWindowSize } from "@react-hook/window-size";
import memoizeOne from "memoize-one";

import { createNodesLinksHulls } from "../util/createNodesLinksHulls";
import { drawForceDag, DrawForceDagHighlightProps, NodeHighlight } from "./drawForce";
import Vertex from "./Vertex";
import Sugiyama from "./Sugiyama";
import Controls from "./Controls";
import SearchSidebar, { SearchTerm, urlSearchParamsToSearchTerms, searchTermToUrlSearchParam } from "./SearchSidebar";
import { OntologyId, OntologyTerm, OntologyPrefix, DatasetGraph } from "../types/d";
import {
  OntologyExplorerState,
  OntologyExplorerProps,
  OntologyVertexDatum,
  CreateDagProps,
  DagStateNodesLinksStrat,
} from "../types/graph";
import lruMemoize from "../util/lruMemo";
import { getHullNodes } from "./drawForce/hulls";
import { interpolateViridis } from "d3-scale-chromatic";

import {
  ontologySubset,
  ontologyFilter,
  OntologyFilterAction,
  OntologyQuery,
  ontologyQuery,
  compartmentQuery,
  createCompartmentQuery,
} from "../util/ontologyDag";

import { useNavigateRef } from "../util/useNavigateRef";
import { Drawer, Classes, DrawerSize } from "@blueprintjs/core";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "../util/errorFallback";

import { useRecoilState, useRecoilValue } from "recoil";

import { dagDataStructureState, urlState } from "../recoil";
import { geneNameConversionTableState, selectedGeneExpressionState } from "../recoil/genes";

import { sugiyamaIsOpenState, selectedGeneState } from "../recoil/controls";
import { sugiyamaIsEnabledState, sugiyamaRenderThresholdState } from "../recoil/sugi";
import { simulationRunningState } from "../recoil/force";

import Dotplot from "./Dotplot";
import Umap from "./Umap";

const defaultForceHightlightProps: DrawForceDagHighlightProps = {
  hullsEnabled: true,
  highlightAncestors: false,
  nodeHighlight: new Map(),
  geneHighlight: null,
};

const defaultState: OntologyExplorerState = {
  dagCreateProps: {
    minimumOutdegree: 0,
    maximumOutdegree: 12345,
    outdegreeCutoffXYZ: 0,
    doCreateSugiyamaDatastructure: true,
    pruningDepth: -1,
  },
  cardWidth: 400,
  cardHeight: 850,
};

export default function OntologyExplorer({ graph }: OntologyExplorerProps): JSX.Element {
  /* recoil */
  /* atoms */
  const [selectedGene] = useRecoilState(selectedGeneState);
  const [sugiyamaIsOpen, setSugiyamaIsOpen] = useRecoilState(sugiyamaIsOpenState);
  const [sugiyamaRenderThreshold] = useRecoilState(sugiyamaRenderThresholdState);
  const [simulationRunning, setSimulationRunning] = useRecoilState(simulationRunningState);
  const [dagDataStructure, setDagDataStructure] = useRecoilState(dagDataStructureState);
  const [, setUrlState] = useRecoilState(urlState);
  /* selectors */
  const selectedGeneExpression = useRecoilValue(selectedGeneExpressionState);
  const geneNameConversionTable = useRecoilValue(geneNameConversionTableState);
  const sugiyamaIsEnabled = useRecoilValue(sugiyamaIsEnabledState);

  /*
   * Component internal state
   */
  const [dagDataStructure_MUTABLE, setDagDataStructure_MUTABLE] = useState<any>(null);
  const [state, setState] = useState<OntologyExplorerState>(defaultState);
  const [hoverNode, setHoverNode] = useState<OntologyVertexDatum>();
  const [forceCanvasHighlightProps, setForceCanvasHighlightProps] =
    useState<DrawForceDagHighlightProps>(defaultForceHightlightProps);

  const [redrawCanvas, setRedrawCanvas] = useState<((p?: DrawForceDagHighlightProps) => void) | null>(null);

  const [windowWidth, windowHeight] = useWindowSize();
  const menubarHeight = 50;
  const cardPadding = 10;
  const forceCanvasWidth = windowWidth - 800;
  const forceCanvasHeight = windowHeight - menubarHeight - 16;

  const { dagCreateProps, cardWidth } = state;

  /*
  TODO: components should not interact with page-level state such as params and search
  params. All of this should move to a file in ./route/ and be up-leveled.
  */

  /*
   * State passed in the URL:
   *    ontoID (path element): the current ontology prefix
   *    vertexID (path element): the currently selected/pinned vertex
   *    root (query param): subset graph on the IDs returned by the OntologyQuery
   *    search (query param): the right side bar search state
   *    xref (query param): the left side bar cross-ref state
   */
  const params = useParams();

  // sync the params with recoil so that we know when the ontology changes
  useEffect(() => {
    setUrlState(params);
  }, [params, setUrlState]);

  const { vertexID: pinnedVertexID } = params;
  // unknown ontology - just display our default.  TODO - we should show an error?
  const ontoID = params.ontoID && params.ontoID in graph.ontologies ? params.ontoID : "CL";
  const ontology = graph.ontologies[ontoID];

  const searchParamsRef = useSearchParamsRef();
  const search = searchParamsRef.current[0].getAll("search");
  const xref = searchParamsRef.current[0].get("xref");
  const query = searchParamsRef.current[0].toString();

  const dagCanvasRef = useRef<HTMLCanvasElement>(null);
  const searchTerms = urlSearchParamsToSearchTerms(search);
  const highlightQuery: OntologyQuery | null = buildHighlightQueries(searchTerms);
  const filterQuery: OntologyQuery | null = buildFilterQueries(searchTerms);

  const hoverVertex: OntologyTerm | undefined = hoverNode && ontology.get(hoverNode.id);
  const pinnedVertex: OntologyTerm | undefined =
    pinnedVertexID !== undefined ? ontology.get(pinnedVertexID) : undefined;

  const { minimumOutdegree, maximumOutdegree } = dagCreateProps;
  const { hullsEnabled, highlightAncestors } = forceCanvasHighlightProps;

  const heightMap = graph.heightMaps[ontoID];
  const depthMap = graph.depthMaps[ontoID];

  const maxDepth = Math.max(...depthMap.values()); // (alec) replace this with iterator through nodes in dagState
  const minDepth =
    Math.max(
      ...searchTerms.map((sT) => {
        const term = ontology.get(sT.searchString);
        const depth = term?.depth ?? 1;
        return sT.filterMode === "keep" ? depth : 1;
      })
    ) + 1;
  const [currentPruningDepth, setCurrentPruningDepth] = useState<number>(maxDepth);
  const handlePruningDepthChange = (e: number) => {
    setCurrentPruningDepth(e);
    setState((s) => ({
      ...s,
      dagCreateProps: {
        ...s.dagCreateProps,
        pruningDepth: e,
      },
    }));
  };
  if (state.dagCreateProps.pruningDepth === -1) {
    handlePruningDepthChange(maxDepth);
  }

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
    setDagDataStructure(createDag(graph, ontoID, filterQuery, dagCreateProps));
  }, [filterQuery, graph, ontoID, dagCreateProps, setDagDataStructure]);

  useEffect(() => {
    /***
     *
     * this is a hack because d3 mutates the dag data structure directly,
     * adding node.vx & node.x, etc, recoiljs will not allow mutation (which is good)
     * and the 'correct' solution would be to rewrite d3 to add a setter.
     * So, in the interest of time, we store the dag data structure in recoil and,
     * as a side effect, persist to local state here in the component (mutable).
     * We want this data structure in global state because there are a number of
     * derived properties which follow from it, like whether the sugiyama layout
     * should be enabled, for instance
     *
     */

    const DEEPCOPY_dagDataStructure = structuredClone(dagDataStructure);

    setDagDataStructure_MUTABLE(DEEPCOPY_dagDataStructure);
  }, [dagDataStructure]);

  useEffect(() => {
    /*
    Rebuild the renderer and simulation-driven layout whenever inputs to the sim change.

    Side effect: sets the render & simulation state.
    */

    if (dagDataStructure_MUTABLE) {
      const { nodes, links } = dagDataStructure_MUTABLE;

      const nodeToHullRoot = new Map();
      let flag = true;
      let height = 7;
      const allHullRoots: string[] = [];
      while (flag && height >= 2) {
        flag = false;
        const hullRoots = []; // get all hullRoots of a certain height
        for (const [k, v] of heightMap) {
          if (v === height) {
            hullRoots.push(k);
          }
        }
        hullRoots.forEach((item) => {
          // for each root
          const hullNodes = getHullNodes(item, ontology, nodes);
          hullNodes.forEach((n: any) => {
            // for each node in root
            if (!nodeToHullRoot.has(n.id)) {
              // if not already assigned a root
              if (!allHullRoots.includes(item)) {
                allHullRoots.push(item); // add root
              }
              nodeToHullRoot.set(n.id, item); // set the root.
            }
          });
        });
        for (const node of nodes) {
          const id = node.id;
          if (!nodeToHullRoot.has(id)) {
            flag = true;
            break;
          }
        }
        height -= 1;
      }
      const hullToNodes = new Map();
      nodeToHullRoot.forEach((v, k) => {
        if (hullToNodes.has(v)) {
          hullToNodes.get(v).push(k);
        } else {
          hullToNodes.set(v, [k]);
        }
      });
      const _redrawCanvas = drawForceDag(
        nodes,
        links,
        hullToNodes,
        dagCanvasRef,
        ontology,
        (node?: OntologyVertexDatum) => setHoverNode(node),
        (node?: OntologyVertexDatum) => go(`../${node?.id ?? ""}`),
        () => setSimulationRunning(false),
        { ...defaultForceHightlightProps, hullsEnabled },
        allHullRoots,
        nodeToHullRoot
      );
      setRedrawCanvas(() => _redrawCanvas);
      setSimulationRunning(() => true);
    }
  }, [ontology, dagDataStructure_MUTABLE, dagCanvasRef, go, hullsEnabled, heightMap, setSimulationRunning]);

  useEffect(() => {
    /*
    Redraw the DAG whenever highlight state changes.
    */
    if (redrawCanvas) {
      const nodeHighlight = new Map<string, NodeHighlight>();
      if (xref) {
        const compartmentCellIds = compartmentQuery(graph.ontologies, xref);
        for (const id of compartmentCellIds) {
          nodeHighlight.set(id, "secondary");
        }
      }
      if (highlightQuery) {
        for (const id of ontologyQuery(graph.ontologies, highlightQuery, ontoID)) {
          nodeHighlight.set(id, "primary");
        }
      }
      if (pinnedVertexID) nodeHighlight.set(pinnedVertexID, "pinned");

      const highlights = {
        ...forceCanvasHighlightProps,
        nodeHighlight,
        geneHighlight: selectedGeneExpression,
      };

      redrawCanvas(highlights);
    }
  }, [
    redrawCanvas,
    forceCanvasHighlightProps,
    pinnedVertexID,
    ontoID,
    highlightQuery,
    xref,
    graph.ontologies,
    selectedGene,
    selectedGeneExpression,
  ]);

  useEffect(() => {
    /*
    Redraw the DAG whenever the canvas size has changed
    */
    if (redrawCanvas) redrawCanvas();
  }, [redrawCanvas, forceCanvasWidth, forceCanvasHeight]);

  /*
   * Controls callbacks
   */
  const onHighlightToggle = (highlightKey: keyof DrawForceDagHighlightProps) => () =>
    setForceCanvasHighlightProps((s) => ({
      ...s,
      [highlightKey]: !s[highlightKey],
    }));

  const handleSetSearchTerms = (terms: SearchTerm[]) => {
    const [searchParams, setSearchParams] = searchParamsRef.current;
    const newSearchParams = createSearchParams(searchParams); // clone
    newSearchParams.delete("search");
    for (const term of terms) {
      newSearchParams.append("search", searchTermToUrlSearchParam(term));
    }
    setSearchParams(newSearchParams); // will navigate
  };

  const updateXref = useCallback(
    (xrefID: OntologyId) => {
      const [searchParams] = searchParamsRef.current;
      const newSearchParams = createSearchParams(searchParams); // clone
      if (xrefID) {
        newSearchParams.set("xref", xrefID);
      } else {
        newSearchParams.delete("xref");
      }
      return newSearchParams;
    },
    [searchParamsRef]
  );

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

  const handleSugiyamaOpen = () => setSugiyamaIsOpen(true);
  const handleSugiyamaClose = () => setSugiyamaIsOpen(false);

  return (
    <div id="ontologyExplorerContainer">
      <Controls
        pinnedVertex={pinnedVertex}
        handleSugiyamaOpen={handleSugiyamaOpen}
        handleDisplayHulls={() =>
          setForceCanvasHighlightProps({ ...forceCanvasHighlightProps, hullsEnabled: !hullsEnabled })
        }
        simulationRunning={simulationRunning}
        menubarHeight={menubarHeight}
        outdegreeCutoffNodes={minimumOutdegree}
        deselectPinnedNode={deselectPinnedVertex}
        handleMinOutdegreeChange={handleMinOutdegreeChange}
        hullsEnabled={!!hullsEnabled}
        handleHullChange={onHighlightToggle("hullsEnabled")}
        highlightAncestors={!!highlightAncestors}
        handleHighlightAncestorChange={onHighlightToggle("highlightAncestors")}
        minimumOutdegree={minimumOutdegree + ""}
        maximumOutdegree={maximumOutdegree + ""}
        minDepth={minDepth}
        maxDepth={maxDepth}
        currentPruningDepth={currentPruningDepth}
        handlePruningDepthChange={handlePruningDepthChange}
      />
      <div id="horizontalScroll" style={{ display: "flex", justifyContent: "space-between" }}>
        <div id="umapContainer">
          <Umap />
        </div>
        <div
          id="card"
          style={{
            width: cardWidth,
            height: windowHeight - menubarHeight - 16,
            overflow: "scroll",
            margin: 0,
          }}
        >
          <div id="innerDivToPreventPaddingSizeIncrease" style={{ padding: cardPadding }}>
            {/**
             * Render cards
             */}
            {!pinnedVertex && hoverVertex && (
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<p>Loading vertex, this is a suspsense fallback ui</p>}>
                  <Vertex
                    searchTerms={searchTerms}
                    setSearchTerms={handleSetSearchTerms}
                    graph={graph}
                    vertex={hoverVertex}
                    query={query}
                    makeTo={(id: OntologyId) => makeLsbTo(id)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
            {pinnedVertex && (
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<p>Loading vertex, this is a suspsense fallback ui</p>}>
                  <Vertex
                    searchTerms={searchTerms}
                    setSearchTerms={handleSetSearchTerms}
                    graph={graph}
                    vertex={pinnedVertex}
                    query={query}
                    makeTo={(id: OntologyId) => makeLsbTo(id)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
        </div>
        {/**
         * Render ontology force layout
         */}
        <div style={{ flexGrow: 1, position: "relative" }}>
          {selectedGene && (
            <svg id="graphLegend" style={{ width: 300, height: 100, position: "absolute", top: "40" }}>
              <text x="20" y="20">
                {geneNameConversionTable.get(selectedGene)}
              </text>
              {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((val, i) => {
                return <rect key={i} x={20 + i * 15} y={30} height={15} width={15} fill={interpolateViridis(val)} />;
              })}
              <text x="20" y="65">
                {parseFloat(selectedGeneExpression.expressionRange[0]).toPrecision(3)}
              </text>
              <text x="158" y="65">
                {parseFloat(selectedGeneExpression.expressionRange[1]).toPrecision(3)}
              </text>
            </svg>
          )}
          <canvas
            style={{
              cursor: "crosshair",
              width: forceCanvasWidth,
              height: forceCanvasHeight,
            }}
            width={forceCanvasWidth * window.devicePixelRatio} // scale up canvas for retina/hidpi
            height={forceCanvasHeight * window.devicePixelRatio}
            ref={dagCanvasRef}
          />
        </div>
        <div
          id="rightSideBarContainer"
          style={{
            width: cardWidth,
            padding: cardPadding,
          }}
        >
          <SearchSidebar
            emptyFilterResult={(dagDataStructure_MUTABLE?.nodes?.length ?? 0) <= 1}
            searchTerms={searchTerms}
            setSearchTerms={handleSetSearchTerms}
          />
        </div>
        {/**
         * Render sugiyama
         */}
        <Drawer
          icon="layout-hierarchy"
          onClose={handleSugiyamaClose}
          title="Hierarchical sub-dag view (scroll ↔️)"
          position={"bottom"}
          isOpen={sugiyamaIsOpen}
          canOutsideClickClose={true}
          canEscapeKeyClose={true}
          size={DrawerSize.LARGE}
        >
          <div className={Classes.DRAWER_BODY}>
            {sugiyamaIsEnabled ? (
              <div style={{ marginLeft: 20, marginTop: 20 }}>
                <Sugiyama />
              </div>
            ) : (
              <div className={Classes.DIALOG_BODY}>
                <p>Select {sugiyamaRenderThreshold} or less cells to display hierarchical layout detail view</p>
              </div>
            )}
          </div>
        </Drawer>
        <Dotplot />
      </div>
    </div>
  );
}

/**
 * Memoize createDag
 */
const createDag = lruMemoize(_createDag, _createDagHash, 1);

function _createDagHash(
  graph: DatasetGraph,
  ontoID: OntologyPrefix,
  filterQuery: OntologyQuery | null,
  options: CreateDagProps
): string {
  return "" + ontoID + JSON.stringify(filterQuery) + JSON.stringify(options);
}

function _createDag(
  graph: DatasetGraph,
  ontoID: OntologyPrefix,
  filterQuery: OntologyQuery | null,
  options: CreateDagProps
): DagStateNodesLinksStrat {
  const { minimumOutdegree, maximumOutdegree, doCreateSugiyamaDatastructure, pruningDepth } = options;

  let ontology = graph.ontologies[ontoID];
  if (filterQuery !== null) {
    const ids = ontologyQuery(graph.ontologies, filterQuery, ontoID);
    ontology = ontologySubset(ontology, ids);
  }

  // Don't bother with the filter if we are down to small number, as this leads to weird graphs
  // with missing nodes, etc.
  if (ontology.size > 1) {
    ontology = ontologyFilter(ontology, (term: OntologyTerm) => {
      const { n_cells } = term;
      const orphanTerm = !n_cells && term.descendants.size === 0 && term.ancestors.size === 0;
      const nChildren = term.children.length;
      if (orphanTerm || nChildren < minimumOutdegree || nChildren > maximumOutdegree || term.depth > pruningDepth) {
        return OntologyFilterAction.RemoveFamily;
      }
      return OntologyFilterAction.Retain;
    });
  }
  const result = createNodesLinksHulls(ontology, doCreateSugiyamaDatastructure);
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

/**
 * Create an ontology query for term highlight from the current search state.
 */
function _buildHighlightQueries(searchTerms: SearchTerm[]): OntologyQuery | null {
  // ignore terms without a highlight value of 'true'
  searchTerms = searchTerms.filter((term) => term.highlight);
  if (searchTerms.length === 0) return null;
  const cellTypeQueries = buildBaseQueries(searchTerms.filter((t) => t.searchMode === "celltype"));
  const compartmentQueries = buildBaseQueries(searchTerms.filter((t) => t.searchMode === "compartment"));
  const queries = cellTypeQueries;
  if (compartmentQueries.length > 0) queries.push(createCompartmentQuery({ $union: compartmentQueries }));
  return {
    $union: queries,
  };
}

const buildHighlightQueries = memoizeOne(_buildHighlightQueries);

/**
 * Create a ontology query for filtering, from the current search state.
 */
function _buildFilterQueries(searchTerms: SearchTerm[]): OntologyQuery | null {
  // filterMode is "none", "keep", "remove".  Ignore "none"
  searchTerms = searchTerms.filter((term) => term.filterMode !== "none");
  if (searchTerms.length === 0) return null;
  const baseQueries = buildBaseQueries(searchTerms);
  const searchQueries = baseQueries.map<OntologyQuery>((q, idx) => {
    if (searchTerms[idx].searchMode === "compartment") {
      q = createCompartmentQuery(q);
    }
    return { $walk: q, $on: "children" };
  });

  let query: OntologyQuery = { $: "all" };
  for (let idx = 0; idx < searchTerms.length; idx += 1) {
    query =
      searchTerms[idx].filterMode === "keep"
        ? { $intersect: [query, searchQueries[idx]] }
        : { $difference: [query, searchQueries[idx]] };
  }
  return query;
}

const buildFilterQueries = memoizeOne(_buildFilterQueries);

/**
 * Map each search item to a query, picking between a text search and a
 * specificy node identity search (based upon duck-typed OBO identifiers)
 *
 * Return an array of queries with 1:1 correspondence & order of the original search terms.
 */
function buildBaseQueries(searchTerms: SearchTerm[]): OntologyQuery[] {
  return searchTerms.map((term) => {
    const { searchString, searchMode } = term;
    if (searchMode === "celltype") {
      if (/^CL:[0-9]{7}$/.test(searchString)) {
        return searchString;
      }
      return { $match: searchString, $from: "CL" };
    } else {
      if (/^UBERON:[0-9]{7}$/.test(searchString)) {
        return searchString;
      }
      return { $match: searchString, $from: "UBERON" };
    }
  });
}
