import { SimulationLinkDatum } from "d3-force";

import { IOntology } from "../d";

export const createNodesLinksHulls = (
  ontology: IOntology,
  nodesToFilter: string[],
  subtree?: string[]
) => {
  const nodes: any = [];
  const links: any = [];
  const sugiyamaStratifyData: any = [];

  ontology.forEach((vertex: any, vertexID: string) => {
    /**
     * If there's a subtree, and the vertex exists in it, push it.
     */
    if (!subtree || subtree.includes(vertexID)) {
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

      sugiyamaStratifyData.push({
        id: vertexID,
        parentIds: vertex.ancestors.filter((a: string) => {
          return !nodesToFilter.includes(a) && subtree?.includes(a); // if it's NOT filtered out and it IS in the subtree, assuming we have one
        }),
      });
    }
  });

  /**
   * filter, there is a smarter way to do this,
   * but filtering links includes filtering out
   * descendents
   */

  const _nodes = nodes.filter((node: any) => {
    return !nodesToFilter.includes(node.id);
  });

  // consider cells x y z, where x → y → z, remove links from x to z, so, if a descendant of x has a link to z, remove the link

  /**
   * remove specified links to filtered nodes...
   * this is necessary because a node may have as a descendant
   * a node which has been filtered, in which case, things will
   * tend to explode.
   */
  const _links = links.filter((l: SimulationLinkDatum<any>) => {
    return (
      !nodesToFilter.includes(l.source) && !nodesToFilter.includes(l.target)
    );
  });

  const _sugiyamaStratifyData = sugiyamaStratifyData.filter((n: any) => {
    return !nodesToFilter.includes(n.id);
  });

  return {
    nodes: _nodes,
    links: _links,
    sugiyamaStratifyData: _sugiyamaStratifyData,
  };
};
