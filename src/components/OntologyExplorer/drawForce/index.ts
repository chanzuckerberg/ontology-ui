import { forceSimulation, forceLink, forceManyBody, forceX, forceY, SimulationLinkDatum, forceCollide } from "d3-force";

import { select } from "d3-selection";

import { OntologyVertexDatum } from "../types";
import { Ontology } from "../../../d";

import { drawHulls } from "./hulls";

import React from "react";
import { scaleLinear } from "d3-scale";

/**
 * Credit & reference:
 *
 * via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas
 * and https://bl.ocks.org/mbostock/6f14f7b7f267a85f7cdc
 *
 */

/**
 * These properties set dynamic highlight state, and may be passed into any
 * re-render to turn on/off highlighting. Changes are persistent between
 * calls, allowing the rendering to be treated as a controlled component.
 *
 * Default highlighting may also be passed ot drawForceDag(), and will set
 * the initial highlighting state.
 */
export type NodeHighlight = "pinned" | "primary" | "secondary";
export interface DrawForceDagHighlightProps {
  hullsEnabled?: boolean;
  highlightAncestors?: boolean;
  nodeHighlight?: Map<string, NodeHighlight>;
}

/**
 * Create a DAG render function and simulation.
 *
 * @param nodes
 * @param links
 * @param dagCanvasRef
 * @param ontology
 * @param setHoverNode
 * @param setPinnedNode
 * @param onForceSimulationEnd
 * @param defaultHighlightProps
 * @returns the rendering function.
 */
export const drawForceDag = (
  nodes: OntologyVertexDatum[],
  links: SimulationLinkDatum<any>[],
  tetherLinks: SimulationLinkDatum<any>[],
  hullToNodes: Map<string,string[]>,
  dagCanvasRef: React.RefObject<HTMLCanvasElement>,
  ontology: Ontology,
  setHoverNode: (node: OntologyVertexDatum | undefined) => void,
  setPinnedNode: (node: OntologyVertexDatum | undefined) => void,
  onForceSimulationEnd: any,
  defaultHighlightProps: DrawForceDagHighlightProps = {},
  hullRoots: string[],
  nodeToHullRoot: Map<string,string>
) => {
  if (!dagCanvasRef || !dagCanvasRef.current) return null;

  /**
   * DOM element
   */
  const htmlCanvas = dagCanvasRef.current;
  const canvas = select(htmlCanvas);

  /**
   * Hover state
   */
  let hoverNode: OntologyVertexDatum | undefined;

  /**
   * Dynamic highlighting & rendering props
   */
  const highlightProps: DrawForceDagHighlightProps = {
    ...defaultHighlightProps,
  };

  /**
   * Sizes
   */
  let nodeSize: number = 5;
  let deemphasizeNodeSize: number = 2.5;

  /* scales */

  const minNodeRadius = 5;
  const maxNodeRadius = 25;

  const cellCountWhale: number = 1000000;
  const cellCountShrimp: number = 1;
  const nCellsScale = scaleLinear().domain([cellCountShrimp, cellCountWhale]).range([minNodeRadius, maxNodeRadius]);

  /**
   * Colors
   */
  const nodeStrokeColor = "white";
  const hoverStrokeColor = "red";
  const hoverNodeDescendantColor = "pink";
  const hoverNodeAncestorColor = "red";
  const linkColor = "rgba(170,170,170,.5)";
  const tooltipColor = "rgb(30, 30, 30)";
  const hullBorderColor = "rgb(255,0,0,.05";
  const hullLabelColor = "rgba(0,0,0,1)";

  const nodeColorDefault = "rgba(170,170,170,1)";
  const nodeColorPinned = "black";
  const nodeColorPrimary = "steelblue";
  const nodeColorSecondary = "orange";

  /**
   * Estimated the coordinate space for the simulation. This is a CRUDE estimate based
   * upon the internals of d3-force::initializeNodes().
   *
   * If we switch to a different layout engine, we'll need to revise this.
   */
  const initialRadius = 10;
  const graphDiameter = 2 * (initialRadius * Math.sqrt(0.5 + nodes.length));
  let canvasInvTransformMatrix: DOMMatrixReadOnly = dagCanvasRef.current.getContext("2d")!.getTransform().inverse();
  /**
   * Set up d3 force simulation
   */
  const simulation = forceSimulation(nodes)
    /**
     * circular layout, if xyz nodes included
     */
    .force(
      "link",
      forceLink(links)
      .id((d: any) => d.id)
      .strength (function (d) {
        const atLeastOneInHull = nodeToHullRoot.has(d.source.id) || nodeToHullRoot.has(d.target.id);
        const inSameHull = nodeToHullRoot.get(d.source.id) === nodeToHullRoot.get(d.target.id);
        const inNoHull = !(atLeastOneInHull || inSameHull);
        let val;
        if (highlightProps.hullsEnabled && atLeastOneInHull && inSameHull) val=1.0;
        //else if(highlightProps.hullsEnabled && inNoHull) val=0.1;
        //else if(highlightProps.hullsEnabled) val=0.1;
        else val=0.1;
        return val;
      })
    )
    .force("charge", forceManyBody()) 
    .force(
      "collision",
      forceCollide().radius((d: any) => {
        return d.n_cells ? nCellsScale(d.n_cells) : deemphasizeNodeSize;
      })
    )
    // Graph is potentially disjoint, so use separate forces,
    // https://observablehq.com/@d3/disjoint-force-directed-graph
    .force("x", forceX())
    .force("y", forceY());

  /**
   * Animation frame.
   */
  const ticked = () => {
    const context = htmlCanvas.getContext("2d");
    if (!context) return;
    const { width, height } = htmlCanvas.getBoundingClientRect();
    const { highlightAncestors, hullsEnabled, nodeHighlight } = highlightProps;

    /**
     * Clear
     */
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, htmlCanvas.width, htmlCanvas.height);

    const canvasMinDimension = width < height ? width : height;
    const canvasScale = (window.devicePixelRatio * canvasMinDimension) / graphDiameter / 2;
    context.translate((window.devicePixelRatio * width) / 2, (window.devicePixelRatio * height) / 2); // move origin to middle of canvas
    context.scale(canvasScale, canvasScale);
    canvasInvTransformMatrix = context.getTransform().inverse();

    /**
     * Draw links
     */
    context.lineWidth = 1;
    context.beginPath();
    for (const link of links) {
      drawLink(link, context);
    }
    context.strokeStyle = linkColor;
    context.stroke();

    /**
     * Draw nodes
     */
    for (const node of nodes) {
      context.beginPath();
      drawNode(node, context);

      // set default fill/stroke color.
      const highlightStyle = nodeHighlight?.get(node.id);
      if (highlightStyle === undefined) {
        context.fillStyle = nodeColorDefault;
      } else if (highlightStyle === "pinned") {
        context.fillStyle = nodeColorPinned;
      } else if (highlightStyle === "primary") {
        context.fillStyle = nodeColorPrimary;
      } else if (highlightStyle === "secondary") {
        context.fillStyle = nodeColorSecondary;
      } else {
        context.fillStyle = nodeColorDefault;
      }
      context.strokeStyle = nodeStrokeColor;

      /**
       * hover & click color
       */
      if (hoverNode) {
        const hoverVertex: any = ontology.get(hoverNode.id);
        // todo perf don't do this lookup here

        if (hoverNode.id === node.id) {
          context.strokeStyle = hoverStrokeColor;
        }
        if (hoverVertex.descendants.has(node.id)) {
          context.fillStyle = hoverNodeDescendantColor;
        }
        if (highlightAncestors && hoverVertex.ancestors.has(node.id)) {
          context.fillStyle = hoverNodeAncestorColor;
        }
      }

      context.fill();
      context.stroke();
    }

    if (hullsEnabled) {
      /**
       * Draw hulls
       */
      drawHulls(ontology, nodes, hullToNodes, context, hullBorderColor, hullLabelColor, hullRoots);

      /**
       * Draw text on hull nodes
       */
      for (const node of nodes) {
        if (hullRoots.includes(node.id)) {
          const vertex: any = ontology.get(node.id);
          if (vertex && vertex.label && typeof vertex.label === "string" && node.x && node.y) {
            context.fillStyle = tooltipColor;
            context.font = "18px monospace";
            const _maxLength = 15;
            const _length = vertex.label.length;
            context.fillText(
              `${vertex.label.substring(0, _maxLength)}${_length > _maxLength ? "..." : ""}`,
              node.x + 7,
              node.y + 3
            );
          }
        }
      }
    }

    /**
     * Draw text tooltip on hover, debug feature, disabled as cell card does this
     */
    if (hoverNode) {
      const vertex: any = ontology.get(hoverNode.id);
      if (vertex && vertex.label && typeof vertex.label === "string") {
        context.fillStyle = tooltipColor;
        context.font = "24px serif";
        context.fillText("", 10, 70);
      }
    }

    context.restore();
  };

  const drawLink = (d: SimulationLinkDatum<any>, context: CanvasRenderingContext2D) => {
    if (context) {
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
    }
    return null;
  };

  const drawNode = (d: OntologyVertexDatum, context: CanvasRenderingContext2D) => {
    /**
     * identify orphan nodes, eject
     */
    if (!d.hasDescendants && !d.hasAncestors) {
      return;
    }

    /* size nodes by inclusion in arbitrary set, in this test case, n_cells has a value */

    const doSizeByInclusion = true;
    const n_cells = d.n_cells;

    /* n_cells for now for example, but make this state */
    const isIncludedInSet = n_cells;

    if (doSizeByInclusion && isIncludedInSet) {
      nodeSize = nCellsScale(n_cells);
    } else if (doSizeByInclusion && !isIncludedInSet) {
      nodeSize = deemphasizeNodeSize;
    }

    /**
     * Draw a circle
     */
    if (context && d && typeof d.x === "number" && typeof d.y === "number") {
      context.moveTo(d.x + nodeSize, d.y);
      context.arc(d.x, d.y, nodeSize, 0, 2 * Math.PI);
    } else {
      console.log("Tried to draw a node, but d.x was not a number, see Dag.tsx drawForce() drawNode");
    }
  };

  const forceRerender = (updatedHighlightProps: DrawForceDagHighlightProps = {}) => {
    Object.assign(highlightProps, updatedHighlightProps);
    ticked();
  };

  /**
   * Register listeners
   */

  simulation.on("tick", ticked);
  simulation.on("end", onForceSimulationEnd);

  /**
   * Return the vertex/node that is nearest the mouse event coordinates.
   */
  const findNode = (event: MouseEvent) => {
    const { left, top } = canvas.node()!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const zeroX = (event.clientX - left) * dpr; // pretend we're relative to upper left of window
    const zeroY = (event.clientY - top) * dpr;
    const { x, y } = canvasInvTransformMatrix.transformPoint({ x: zeroX, y: zeroY });
    return simulation.find(x, y);
  };

  canvas.on("mousemove", (event: MouseEvent) => {
    event.preventDefault();
    hoverNode = findNode(event);
    setHoverNode(hoverNode);
    ticked();
  });

  canvas.on("click", (event: MouseEvent) => {
    event.preventDefault();
    const clickNode = findNode(event);
    setPinnedNode(clickNode);
  });

  /**
   * We return the ticked function so that we can force redraws
   * from the parent. This allows us to, for instance, drive
   * the canvas visualization if we type into a search box,
   * where the user interaction is not coming from the
   */
  return forceRerender;
};
