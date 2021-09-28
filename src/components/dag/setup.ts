import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceRadial,
  SimulationLinkDatum,
} from "d3-force";

import { OntologyVertexDatum } from "./Dag";
import { IOntology } from "../../d";

export const drawForceDag = (
  nodes: OntologyVertexDatum[],
  links: SimulationLinkDatum<any>[],
  width: number,
  height: number,
  dagCanvasRef: any
) => {
  /* via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas */

  const simulation = forceSimulation(nodes)
    // .force(
    //   "link",
    //   forceLink(links).id((d: any) => d.id)
    // )
    // .force("charge", forceManyBody())
    .force("center", forceCenter(width / 2, height / 2))
    .force("charge", forceCollide().radius(5).iterations(2))
    /**
     * This force creates rings.
     * We want the nodes with tons of descendents pinned to a small inner circle
     * We want the nodes with no descendents to float to the outside
     * Setting the charge to 0 kills the effect for nodes we want to find their own way
     */
    .force(
      "r",
      forceRadial(
        (d: any) => {
          if (d.descendantCount === 0) {
            return 600;
          } else if (d.descendantCount > 200) {
            return 50;
          } else {
            return 300;
          }
        },
        width / 2,
        height / 2
      ).strength((d) => {
        if (d.descendantCount === 0) {
          return 1;
        } else if (d.descendantCount > 200) {
          return 1;
        } else {
          return 1;
        }
      })
    );

  const context = dagCanvasRef.current!.getContext("2d"); //.context2d(width, height);
  simulation.on("tick", ticked);

  function ticked() {
    if (context) {
      context.clearRect(0, 0, width, height);

      context.beginPath();
      links.forEach(drawLink);
      context.strokeStyle = "rgba(200,200,200,.2)";
      context.stroke();

      context.strokeStyle = "#fff";
      for (const node of nodes) {
        context.beginPath();
        drawNode(node);
        context.fillStyle = "steelblue"; //color(node);
        context.fill();
        context.stroke();
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
  return null;
};

export const createNodesAndLinks = (
  ontology: IOntology,
  nodesToFilter: string[]
) => {
  const nodes: any = [];
  const links: any = [];

  ontology.forEach((vertex: any, vertexID: string) => {
    if (vertex.descendants && vertex.descendants.length > 500) {
      console.log(vertexID, vertex);
    }
  });

  ontology.forEach((vertex: any, vertexID: string) => {
    nodes.push({ id: vertexID, descendantCount: vertex.descendants.length });

    vertex.descendants.forEach((descendent: string) => {
      links.push({
        source: vertexID,
        target: descendent,
      });
    });
  });

  /* remove specified nodes */
  const _links = links.filter((l: SimulationLinkDatum<any>) => {
    return (
      !nodesToFilter.includes(l.source) && !nodesToFilter.includes(l.target)
    );
  });

  return { nodes, links: _links };
};
