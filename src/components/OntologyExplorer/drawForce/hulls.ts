import { polygonHull } from "d3-polygon";

import { Ontology } from "../../../d";

import { interpolateSinebow } from "d3-scale-chromatic";
import { color } from "d3-color";
import { scaleLinear } from "d3-scale";

/**
 * Draw all hulls
 */
export const drawHulls = (
  ontology: Ontology,
  nodes: any,
  context: any,
  hullBorderColor: string,
  hullLabelColor: string,
  hullRoots: string[]
) => {
  /**
   * GIVEN ALL PRIOR FILTERED NODES
   */
  /**
   * CUSTOM SUBSET FOR TEST
   */
  //  ["CL:0002086", "CL:0002031", "CL:1000504"]
  hullRoots.forEach((vertex_id: string, i, arr) => {
    drawHull(vertex_id, ontology, nodes, context, hullBorderColor, hullLabelColor, i, arr);
  });
};

/**
 * Draw one hull
 */
const drawHull = (
  vertex_id: string,
  ontology: Ontology,
  nodes: any,
  context: any,
  hullBorderColor: string,
  hullLabelColor: string,
  index: number,
  arr: string[]
) => {
  /**
   * Retreive the vertex for its name and descendants
   */

  /**
   * Pick a color, and fade it
   * https://github.com/d3/d3-color#d3-color
   */
  var colorScale = scaleLinear().domain([0, arr.length]).range([0, 1]);
  const _sineBowColor: string = interpolateSinebow(colorScale(index));
  const _sineBowColorObj: any = color(_sineBowColor);
  _sineBowColorObj.opacity = 0.1;
  const hullColor = _sineBowColorObj + "";

  /**
   * Filter the simulation's nodes that are descendants of the given vertex
   * Create the hull
   */
  const filteredNodes = getHullNodes(vertex_id,ontology,nodes);

  let points: any = [];

  filteredNodes.forEach((node: any) => {
    points.push([node.x, node.y]);
  });

  const hull = polygonHull(points);

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
    context.lineWidth = 0;
    context.strokeStyle = hullColor;
    context.stroke();
  }
};

export const getHullNodes = (
  vertex_id: string,
  ontology: Ontology,
  nodes: any,
) => {
  /**
   * Get nodes belonging to a hull
   */
  const vertex: any = ontology.get(vertex_id);

  return nodes.filter((node: any) => {
    return vertex.children.includes(node.id) || node.id === vertex_id; // include self
  });
}