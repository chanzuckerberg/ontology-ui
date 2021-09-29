import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  SimulationLinkDatum,
} from "d3-force";

import { select } from "d3-selection";

import { OntologyVertexDatum } from "./Dag";
import { IOntology } from "../../d";

export const drawForceDag = (
  nodes: OntologyVertexDatum[],
  links: SimulationLinkDatum<any>[],
  width: number,
  height: number,
  dagCanvasRef: any,
  ontology: IOntology
) => {
  /* via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas */

  /* typescript this is a mashup between mouse coords and ontology attributes, which d3 has trouble with */
  let closestNode: any = null;

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

  const context = dagCanvasRef.current!.getContext("2d"); //.context2d(width, height);

  simulation.on("tick", ticked);

  // const decideFill = (node, closestNode, ontology) => {

  // };

  function ticked() {
    if (context) {
      context.clearRect(0, 0, width, height);

      context.beginPath();
      links.forEach(drawLink);
      context.strokeStyle = "rgba(150,150,150,.3)";
      context.stroke();

      context.strokeStyle = "#fff";
      for (const node of nodes) {
        context.beginPath();
        drawNode(node);
        context.fillStyle =
          closestNode && closestNode.id === node.id ? "red" : "black"; //color(node);
        context.fill();
        context.stroke();
      }

      if (closestNode) {
        const vertex: any = ontology.get(closestNode.id);
        if (vertex && vertex.label && typeof vertex.label === "string") {
          context.font = "48px serif";
          context.fillText(
            `${vertex.label}${closestNode.id}`,
            closestNode.x,
            closestNode.y
          );
        }
      }
    }
  }

  const drawLink = (d: SimulationLinkDatum<any>) => {
    if (context) {
      context.moveTo(d.source.x, d.source.y);
      context.lineTo(d.target.x, d.target.y);
    }
    return null;
  };

  const drawNode = (d: OntologyVertexDatum) => {
    /* refactor this if statement away */
    if (context && d && typeof d.x === "number" && typeof d.y === "number") {
      context.moveTo(d.x + 3, d.y);
      context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
    } else {
      console.log(
        "Tried to draw a node, but d.x was not a number, see Dag.tsx drawForce() drawNode"
      );
    }
  };

  const canvas = select(dagCanvasRef.current);
  canvas.on("mousemove", (event) => {
    closestNode = simulation.find(event.clientX, event.clientY);
    ticked();
  });

  return null;
};
