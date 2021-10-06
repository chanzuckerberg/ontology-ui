import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  SimulationLinkDatum,
} from "d3-force";

import { select } from "d3-selection";
import { polygonHull, polygonCentroid } from "d3-polygon";

import { OntologyVertexDatum } from "./Dag";
import { IOntology, IVertex } from "../../d";

/**
 * via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas
 * and https://bl.ocks.org/mbostock/6f14f7b7f267a85f7cdc
 */
export const drawForceDag = (
  nodes: OntologyVertexDatum[],
  links: SimulationLinkDatum<any>[],
  width: number,
  height: number,
  dagCanvasRef: any,
  ontology: IOntology,
  filteredVerticesForHulls: string[],
  setHoverNode: any,
  setPinnedNode: any,
  incrementRenderCounter: any,
  onForceSimulationEnd: any,
  hullsTurnedOn: boolean
) => {
  /**
   * Let parent component know we rendered
   */
  incrementRenderCounter();
  /**
   * DOM element
   */
  const canvas: any = select(dagCanvasRef.current);
  const context: any = dagCanvasRef.current!.getContext("2d"); //.context2d(width, height);

  /**
   * Hover state
   */
  let hoverNode: any = null;

  /**
   * Click state
   */
  let clickNode: any = null;

  /**
   * Colors
   */
  const hullColor = "rgba(255,0,0,.05)"; //"transparent";
  const hullBorderColor = "rgb(255,0,0,.05";
  const hullLabelColor = "rgba(0,0,0,1)";
  const nodeColor = "rgba(100,100,100,1)";
  const linkColor = "rgba(50,50,50,.5)";
  const tooltipColor = "rgba(0,0,0,1)";
  const hoverNodeColor = "rgba(200,200,200,1)";
  const hoverNodeDescendantColor = "LightPink";
  const hoverNodeAncestorColor = "red";
  const clickedNodeColor = "green";
  const nodeColorNotInSearch = "rgba(100,100,100,.2)";
  const nodeColorInSearch = "steelblue";

  /**
   * Set up d3 force simulation
   */
  const simulation = forceSimulation(nodes)
    .force(
      "link",
      forceLink(links).id((d: any) => d.id)
    )
    .force("charge", forceManyBody())
    // we are disjoint because we're disconnecting the dag to get territories
    // https://observablehq.com/@d3/disjoint-force-directed-graph
    .force("x", forceX(width / 2))
    .force("y", forceY(height / 2));

  // let resized = false;

  /**
   * Animation frame
   */
  const ticked = (searchString?: string) => {
    if (context) {
      /**
       * Clear
       */
      context.clearRect(0, 0, width, height);

      const dpr = window.devicePixelRatio;

      // if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      // if (!resized) {
      //   context.scale(0.8, 0.8);
      //   resized = true;
      // }

      /**
       * Draw links
       */
      context.lineWidth = 1;
      context.beginPath();
      links.forEach(drawLink);
      context.strokeStyle = linkColor;
      context.stroke();

      /**
       * Draw nodes
       */
      context.strokeStyle = "#fff";
      for (const node of nodes) {
        context.beginPath();
        drawNode(node);

        /**
         * Default color of node
         * last true statement after takes precedence
         */
        context.fillStyle = nodeColor;
        /**
         * fade the node back if it's not in the search string
         */
        if (searchString) {
          const vertex: any = ontology.get(node.id);

          if (vertex && vertex.label) {
            const _hit = vertex.label
              .toLowerCase()
              .includes(searchString.toLowerCase());
            if (_hit) {
              context.fillStyle = nodeColorInSearch;
            } else {
              context.fillStyle = nodeColorNotInSearch;
            }
          }
        }
        /**
         * hover & click color
         */
        if (clickNode && clickNode.id === node.id) {
          context.fillStyle = clickedNodeColor;
        }

        if (hoverNode) {
          const hoverVertex: any = ontology.get(hoverNode.id);
          // todo perf don't do this lookup re;

          if (hoverNode.id === node.id) {
            context.fillStyle = hoverNodeColor;
          }
          if (hoverVertex.descendants.includes(node.id)) {
            context.fillStyle = hoverNodeDescendantColor;
          }
          if (hoverVertex.ancestors.includes(node.id)) {
            context.fillStyle = hoverNodeAncestorColor;
          }
        }
        context.fill();
        context.stroke();
      }

      /**
       * Draw hulls first, z index
       */
      if (hullsTurnedOn) {
        drawHulls();
      }

      /**
       * Draw text tooltip near node, on hover
       */
      if (hoverNode) {
        const vertex: any = ontology.get(hoverNode.id);
        if (vertex && vertex.label && typeof vertex.label === "string") {
          context.fillStyle = tooltipColor;
          context.font = "24px serif";
          context.fillText(
            `${vertex.label}${hoverNode.id}`,
            hoverNode.x,
            hoverNode.y
          );
        }
      }
    }
  };

  /**
   * Draw all hulls
   */
  const drawHulls = () => {
    /**
     * GIVEN ALL PRIOR FILTERED NODES
     */
    filteredVerticesForHulls.forEach((vertex_id, i) => {
      drawHull(vertex_id);
    });
    /**
     * CUSTOM SUBSET FOR TEST
     */
    //  ["CL:0002086", "CL:0002031", "CL:1000504"]
    ["CL:0002086"].forEach((vertex_id, i) => {
      drawHull(vertex_id);
    });
  };

  /**
   * Draw one hull
   */
  const drawHull = (vertex_id: string) => {
    /**
     * Retreive the vertex for its name and descendents
     */
    const vertex: any = ontology.get(vertex_id);

    /**
     * Filter the simulation's nodes that are descendents of the given vertex
     * Create the hull
     */
    const filteredNodes = nodes.filter((node: any) => {
      return vertex.descendants.includes(node.id);
    });

    let points: any = [];

    filteredNodes.forEach((node) => {
      points.push([node.x, node.y]);
    });

    const hull = polygonHull(points);
    const centroid = polygonCentroid(points);

    if (hull) {
      /**
       * Paint the hull
       */
      context.beginPath();
      context.moveTo(hull[0][0], hull[0][1]);
      for (var i = 1, n = hull.length; i < n; ++i) {
        context.lineTo(hull[i][0], hull[i][1]);
      }
      context.closePath();
      context.fillStyle = hullColor;
      context.fill();

      /**
       * Hull border
       */
      context.lineWidth = 1;
      context.strokeStyle = hullBorderColor;
      context.stroke();

      /**
       * Text on centroid of hull
       */
      context.fillStyle = hullLabelColor;
      context.font = "18px helvetica";
      context.fillText(
        `${vertex.label}`, //${vertex_id}`
        /**
         * subtract some width to center text
         */
        centroid[0] - 100,
        centroid[1] - 15
      );
    }
  };

  const drawLink = (d: SimulationLinkDatum<any>) => {
    if (context) {
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
    }
    return null;
  };

  const drawNode = (d: OntologyVertexDatum) => {
    /**
     * identify orphan nodes, eject
     */
    if (d.descendantCount === 0 && d.ancestorCount === 0) {
      return;
    }

    /**
     * Draw a circle
     */
    const nodeSize: number = 7;
    if (context && d && typeof d.x === "number" && typeof d.y === "number") {
      context.moveTo(d.x + nodeSize, d.y);
      context.arc(d.x, d.y, nodeSize, 0, 2 * Math.PI);
    } else {
      console.log(
        "Tried to draw a node, but d.x was not a number, see Dag.tsx drawForce() drawNode"
      );
    }
  };

  /**
   * Register listeners
   */

  simulation.on("tick", ticked);
  simulation.on("end", onForceSimulationEnd);

  canvas.on("mousemove", (event: any) => {
    // if we manage ticked() from above, this could be hoisted to the react context
    hoverNode = simulation.find(event.clientX, event.clientY);
    setHoverNode(hoverNode);
    ticked();
  });
  canvas.on("click", (event: any) => {
    clickNode = simulation.find(event.clientX, event.clientY);
    setPinnedNode(clickNode);
    ticked();
  });

  /**
   * We return the ticked function so that we can force redraws
   * from the parent. This allows us to, for instance, drive
   * the canvas visualization if we type into a search box,
   * where the user interaction is not coming from the
   */
  return ticked;
};
