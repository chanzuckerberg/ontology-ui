import { polygonHull, polygonCentroid } from "d3-polygon";

import { IOntology } from "../../../d";

/**
 * Draw all hulls
 */
export const drawHulls = (
  ontology: IOntology,
  nodes: any,
  context: any,
  hullColor: string,
  hullBorderColor: string,
  hullLabelColor: string
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
  ["CL:0002086"].forEach((vertex_id: string, i) => {
    drawHull(
      vertex_id,
      ontology,
      nodes,
      context,
      hullColor,
      hullBorderColor,
      hullLabelColor
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
  hullColor: string,
  hullBorderColor: string,
  hullLabelColor: string
) => {
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
