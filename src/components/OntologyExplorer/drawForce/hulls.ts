import { polygonHull, polygonCentroid } from "d3-polygon";

import { IOntology } from "../../../d";

import { interpolateSinebow } from "d3-scale-chromatic";
import { color } from "d3-color";
import { scaleLinear } from "d3-scale";
import { arrayLengthCompare } from "@blueprintjs/core/lib/esm/common/utils";

/**
 * Draw all hulls
 */
export const drawHulls = (
  ontology: IOntology,
  nodes: any,
  context: any,
  hullBorderColor: string,
  hullLabelColor: string,
  hullRoots: string[]
) => {
  /**
   * GIVEN ALL PRIOR FILTERED NODES
   */
  // filteredVerticesForHulls.forEach((vertex_id, i) => {
  //   drawHull(vertex_id);
  // });
  /**
   * CUSTOM SUBSET FOR TEST
   */
  //  ["CL:0002086", "CL:0002031", "CL:1000504"]
  hullRoots.forEach((vertex_id: string, i, arr) => {
    drawHull(
      vertex_id,
      ontology,
      nodes,
      context,
      hullBorderColor,
      hullLabelColor,
      i,
      arr
    );
  });
};

/**
 * Draw one hull
 */
const drawHull = (
  vertex_id: string,
  ontology: IOntology,
  nodes: any,
  context: any,
  hullBorderColor: string,
  hullLabelColor: string,
  index: number,
  arr: string[]
) => {
  /**
   * Retreive the vertex for its name and descendents
   */
  const vertex: any = ontology.get(vertex_id);

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
   * Filter the simulation's nodes that are descendents of the given vertex
   * Create the hull
   */
  const filteredNodes = nodes.filter((node: any) => {
    return vertex.descendants.includes(node.id) || node.id === vertex_id; // include self
  });

  let points: any = [];

  filteredNodes.forEach((node: any) => {
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
    // context.fillStyle = hullLabelColor;
    // context.font = "18px helvetica";
    // context.fillText(
    //   `${vertex.label}`, //${vertex_id}`
    //   /**
    //    * subtract some width to center text
    //    */
    //   centroid[0],
    //   centroid[1]
    // );
  }
};
