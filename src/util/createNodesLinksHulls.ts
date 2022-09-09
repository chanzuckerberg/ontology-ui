import { OntologyVertexDatum } from "../components/graph.d";

import { Ontology, OntologyTerm } from "../d";

export const createNodesLinksHulls = (ontology: Ontology, doCreateSugiyamaDatastructure: boolean) => {
  const nodes: OntologyVertexDatum[] = [];
  const links: { source: string; target: string }[] = [];
  const sugiyamaStratifyData: { id: string; parentIds: string[] }[] = [];

  ontology.forEach((vertex: OntologyTerm, vertexID: string) => {
    /**
     * If there's a subtree, and the vertex exists in it, push it.
     */
    nodes.push({
      id: vertexID,
      hasDescendants: !!vertex.children.length,
      hasAncestors: !!vertex.parents.length,
      n_cells: vertex.n_cells ? vertex.n_cells : 0,
    });
    vertex.children.forEach((descendant: string) => {
      links.push({
        source: vertexID,
        target: descendant,
      });
    });

    if (doCreateSugiyamaDatastructure) {
      sugiyamaStratifyData.push({
        id: vertexID,
        parentIds: vertex.parents,
      });
    }
  });

  return {
    nodes: nodes,
    links: links,
    sugiyamaStratifyData: sugiyamaStratifyData,
  };
};
