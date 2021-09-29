import { SimulationLinkDatum } from "d3-force";

import { IOntology } from "../../d";

export const createNodesAndLinks = (
  ontology: IOntology,
  nodesToFilter: string[]
) => {
  const nodes: any = [];
  const links: any = [];

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
