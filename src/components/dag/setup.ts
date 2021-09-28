import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceRadial,
  forceY,
  SimulationLinkDatum,
  SimulationNodeDatum,
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
    .force(
      "link",
      forceLink(links)
        .id((d: any) => d.id)
        .strength(0.1)
    )
    .force("charge", forceManyBody())
    .force("center", forceCenter(width / 2, height / 2))
    // .force(
    //   "yAxis",
    //   forceY((d: any) => {
    //     let yPosition = 0;
    //     if (d.descendantCount === 0) {
    //       yPosition = height - 100;
    //     }
    //     return yPosition;
    //   }).strength((d) => {
    //     let _strength = 0;
    //     if (d.descendantCount === 0) {
    //       _strength = 1;
    //     }
    //     return _strength;
    //   })
    // );
    // .force("charge", forceCollide().radius(5).iterations(2));
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
          // middle, by default
          let radius = 300;

          // mega parents, inner ring
          if (d.descendantCount > 30) {
            radius = 50;
          }

          // if (d.descendantCount < 200 && d.descendantCount > 50) {
          //   radius = 100;
          // }

          // if (d.descendantCount === 0) {
          //   radius = 700;
          // }

          return radius;
        },
        width / 2,
        height / 2
      ).strength((d) => {
        // off by default
        let _strength = 0;

        // mega parents, outer ring
        if (d.descendantCount > 200) {
          _strength = 1;
        }

        // if (d.descendantCount < 200 && d.descendantCount > 50) {
        //   _strength = 1;
        // }

        // if (d.descendantCount === 0) {
        //   _strength = 0;
        // }

        return _strength;
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
    nodes.push({ id: vertexID, descendantCount: vertex.descendants.length });
    if (vertex.descendants.length > 100) {
      vertex.descendants.forEach((descendent: string) => {
        links.push({
          source: vertexID,
          target: descendent,
        });
      });
    }
  });

  /* remove specified nodes */
  const _links = links.filter((l: SimulationLinkDatum<any>) => {
    return (
      !nodesToFilter.includes(l.source) && !nodesToFilter.includes(l.target)
    );
  });

  return { nodes, links: _links };
};
