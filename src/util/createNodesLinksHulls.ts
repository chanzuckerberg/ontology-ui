import { OntologyVertexDatum } from "../components/OntologyExplorer/types";

import { Ontology, OntologyTerm } from "../d";

export const createNodesLinksHulls = (ontology: Ontology, link_tables: any, doCreateSugiyamaDatastructure: boolean) => {
  const nodes: OntologyVertexDatum[] = [];
  const links: { source: string; target: string }[] = [];
  const tetherLinks: { source: string; target: string; strength: number; }[] = [];
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
  const nodeIDs = nodes.map((item)=>item.id);
  nodes.forEach((node)=>{
    link_tables[node.id]?.forEach((neighbor: any)=>{
      if (nodeIDs.includes(neighbor[0])) {
        tetherLinks.push({
          source: node.id,
          target: neighbor[0],
          strength: neighbor[1]
        })
      }
    })
  });
  return {
    nodes: nodes,
    links: links,
    tetherLinks: tetherLinks,
    sugiyamaStratifyData: sugiyamaStratifyData,
  };
};
