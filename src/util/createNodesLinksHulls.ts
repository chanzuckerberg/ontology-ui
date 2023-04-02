import { OntologyVertexDatum } from "../types/graph";
import { Ontology, OntologyTerm } from "../types/d";
import { CensusCounts } from "../recoil/portal";

export const createNodesLinksHulls = (ontology: Ontology, doCreateSugiyamaDatastructure: boolean, portalCellTypeCounts: CensusCounts) => {
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
      n_cells: portalCellTypeCounts[vertexID] ? portalCellTypeCounts[vertexID].unique_cell_count : 0,
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
