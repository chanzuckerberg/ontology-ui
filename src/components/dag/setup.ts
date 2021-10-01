import { SimulationLinkDatum } from "d3-force";

import { IOntology } from "../../d";

export const createNodesLinksHulls = (
  ontology: IOntology,
  nodesToFilter: string[]
) => {
  const nodes: any = [];
  const links: any = [];

  ontology.forEach((vertex: any, vertexID: string) => {
    nodes.push({
      id: vertexID,
      descendantCount: vertex.descendants.length,
      ancestorCount: vertex.ancestors.length,
    });
    vertex.descendants.forEach((descendent: string) => {
      links.push({
        source: vertexID,
        target: descendent,
      });
    });
  });

  const _nodes = nodes.filter((node: any) => {
    return !nodesToFilter.includes(node.id);
  });

  /* remove specified nodes */
  const _links = links.filter((l: SimulationLinkDatum<any>) => {
    return (
      !nodesToFilter.includes(l.source) && !nodesToFilter.includes(l.target)
    );
  });

  return { nodes: _nodes, links: _links };
};
