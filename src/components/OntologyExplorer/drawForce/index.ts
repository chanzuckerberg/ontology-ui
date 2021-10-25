import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  SimulationLinkDatum,
} from "d3-force";

import { select } from "d3-selection";
import { interpolateSinebow } from "d3-scale-chromatic";

import { OntologyVertexDatum } from "..";
import { IOntology } from "../../../d";

import { drawHulls } from "./hulls";

import { tabulaSapiensCelltypes } from "../../../tabulaSapiensCelltypes";

/**
 * via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas
 * and https://bl.ocks.org/mbostock/6f14f7b7f267a85f7cdc
 */
export const drawForceDag = (
  nodes: OntologyVertexDatum[],
  links: SimulationLinkDatum<any>[],
  width: number,
  height: number,
  scaleFactor: number,
  translateCenter: number,
  dagCanvasRef: any,
  ontology: IOntology,
  setHoverNode: any,
  setPinnedNode: any,
  incrementRenderCounter: any,
  onForceSimulationEnd: any,
  hullsTurnedOn: boolean,
  _latticeCL: any,
  compartment: string | null,
  highlightAncestors: boolean,
  showTabulaSapiensDataset: boolean
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
  const boundingRect = dagCanvasRef.current.getBoundingClientRect();
  const dpr = window.devicePixelRatio;

  /**
   * Hover state
   */
  let hoverNode: any = null;

  /**
   * Click state
   */
  let clickNode: any = null;

  /**
   * Hull root vertices
   */
  const hullRoots: string[] = [
    // hardcoded for the alpha, to be inferred with a heuristic
    "CL:0002086",
    "CL:0000542",
    // "CL:0000540",
    "CL:0000084",
    "CL:0000236",
    "CL:1000497",
    "CL:0000039",
    "CL:0000125",
    "CL:0000101",
    "CL:0000099",
    "CL:0002563",
    // "CL:0000988",
    "CL:0000451",
    "CL:0008007",
    "CL:0002368",
    // "CL:0000763",
    "CL:0000163",
    "CL:0000147",
    "CL:0011026",
    "CL:0000094",
    "CL:0000100",
    "CL:0001035",
    "CL:0001065",
    "CL:0000786",
    "CL:1000854",
    "CL:0000235",
    "CL:0000210",
  ];

  /**
   * Sizes
   */
  const nodeSize: number = 5;
  /**
   * Colors
   */
  const nodeColor = "rgba(170,170,170,1)";
  const nodeStrokeColor = "white";
  const hoverStrokeColor = "red";
  const hoverNodeDescendantColor = "pink";
  const hoverNodeAncestorColor = "red";
  const clickedNodeColor = "black";
  const nodeColorNotInSearch = "rgba(100,100,100,.2)";
  const nodeColorInSearch = "steelblue";
  const linkColor = "rgba(170,170,170,.5)";
  const tooltipColor = "rgb(30, 30, 30)";
  const hullBorderColor = "rgb(255,0,0,.05";
  const hullLabelColor = "rgba(0,0,0,1)";
  const datasetDistributionColor = interpolateSinebow(0.9);

  /**
   * Set up d3 force simulation
   */
  const simulation = forceSimulation(nodes)
    /**
     * circular layout, if xyz nodes included
     */
    .force(
      "link",
      forceLink(links).id((d: any) => d.id)
    )
    .force("charge", forceManyBody())
    // we are disjoint because we're disconnecting the dag to get territories
    // https://observablehq.com/@d3/disjoint-force-directed-graph
    .force("x", forceX((width * dpr) / 2))
    .force("y", forceY((height * dpr) / 2));

  /**
   * Tree layout, if xyz nodes excluded
   */
  // .force(
  //   "link",
  //   forceLink(links)
  //     .id((d: any) => d.id)
  //     .distance(0)
  //     .strength(1)
  // )
  // .force("charge", forceManyBody().strength(-50))
  // .force("x", forceX((width * dpr) / 2)) //(width * dpr) / 2))
  // .force("y", forceY((height * dpr) / 2)); //(height * dpr) / 2));

  /**
   * Animation frame
   */
  const ticked = (searchString?: string) => {
    if (context) {
      /**
       * Clear
       */
      context.save();

      context.clearRect(0, 0, width * dpr, height * dpr);

      /**
       * Scale up or down depending on number of nodes
       */

      // context.scale(2, 2);
      // context.translate(-width / 2, -height / 2);

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
          // todo perf don't do this lookup here

          if (hoverNode.id === node.id) {
            // context.fillStyle = hoverNodeColor;
            context.strokeStyle = hoverStrokeColor;
          }
          if (hoverVertex.descendants.includes(node.id)) {
            context.fillStyle = hoverNodeDescendantColor;
          }
          if (hoverVertex.ancestors.includes(node.id) && highlightAncestors) {
            context.fillStyle = hoverNodeAncestorColor;
          }
        }

        /**
         * check dataset distribution in ontology
         */

        if (
          showTabulaSapiensDataset &&
          tabulaSapiensCelltypes.includes(node.id)
        ) {
          context.fillStyle = datasetDistributionColor;
        }

        /**
         * check compartment distribution in ontology
         */
        if (_latticeCL && compartment) {
          const celltype_is_in_compartment = _latticeCL
            .get(node.id)
            .ancestors.includes(compartment);
          if (celltype_is_in_compartment) {
            context.fillStyle = "orange";
          }
        }

        context.fill();
        context.stroke();

        /**
         * end, reset cases
         */
        context.strokeStyle = nodeStrokeColor; // reset, in case it was hover
      }

      /**
       * Draw text on nodes, for alpha, this writes tabula sapiens nodes out
       */
      if (showTabulaSapiensDataset) {
        for (const node of nodes) {
          if (tabulaSapiensCelltypes.includes(node.id)) {
            const vertex: any = ontology.get(node.id);
            if (vertex && vertex.label && typeof vertex.label === "string") {
              context.fillStyle = tooltipColor;
              context.font = "18px serif";
              context.fillText(
                `${vertex.label.substring(0, 10)}`,
                node.x,
                node.y
              );
            }
          }
        }
      }

      if (hullsTurnedOn) {
        /**
         * Draw hulls
         */
        drawHulls(
          ontology,
          nodes,
          context,
          hullBorderColor,
          hullLabelColor,
          hullRoots
        );

        /**
         * Draw text on hull nodes
         */
        for (const node of nodes) {
          if (hullRoots.includes(node.id)) {
            const vertex: any = ontology.get(node.id);
            if (
              vertex &&
              vertex.label &&
              typeof vertex.label === "string" &&
              node.x &&
              node.y
            ) {
              context.fillStyle = tooltipColor;
              context.font = "14px monospace";
              const _maxLength = 15;
              const _length = vertex.label.length;
              context.fillText(
                `${vertex.label.substring(0, _maxLength)}${
                  _length > _maxLength ? "..." : ""
                }`,
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
          context.fillText(
            "",
            //`${vertex.label}${hoverNode.id}`,
            // hoverNode.x,
            // hoverNode.y
            10,
            70
          );
        }
      }

      context.restore();
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

  // https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
  canvas.on("mousemove", (event: any) => {
    const zeroX = event.clientX - boundingRect.left; // pretend we're relative to upper left of window
    const zeroY = event.clientY - boundingRect.top;

    hoverNode = simulation.find(zeroX * dpr, zeroY * dpr);
    setHoverNode(hoverNode);
    ticked();
  });
  canvas.on("click", (event: any) => {
    const zeroX = event.clientX - boundingRect.left; // pretend we're relative to upper left of window
    const zeroY = event.clientY - boundingRect.top;

    clickNode = simulation.find(zeroX * dpr, zeroY * dpr);
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
