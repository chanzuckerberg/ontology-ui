import { SimulationLinkDatum } from "d3-force";
import { OntologyVertexDatum } from "../components/OntologyExplorer";

import { Ontology, OntologyTerm } from "../d";

export const createNodesLinksHulls = (
  ontology: Ontology,
  nodesToFilter: string[],
  outdegreeCutoff: number,
  doCreateSugiyamaDatastructure: boolean,
  subtree?: string[]
) => {
  const nodes: OntologyVertexDatum[] = [];
  const links: { source: string; target: string }[] = [];
  const sugiyamaStratifyData: { id: string; parentIds: string[] }[] = [];

  ontology.forEach((vertex: OntologyTerm, vertexID: string) => {
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

      if (subtree && doCreateSugiyamaDatastructure) {
        sugiyamaStratifyData.push({
          id: vertexID,
          parentIds: vertex.ancestors.filter((a: string) => {
            return !nodesToFilter.includes(a) && subtree.includes(a); // if it's NOT filtered out and it IS in the subtree, assuming we have one
          }),
        });
      } else if (doCreateSugiyamaDatastructure) {
        sugiyamaStratifyData.push({
          id: vertexID,
          parentIds: vertex.ancestors.filter((a: string) => {
            return !nodesToFilter.includes(a);
          }),
        });
      }
    }
  });

  /**
   * filter, there is a smarter way to do this,
   * but filtering links includes filtering out
   * descendents
   */

  const _nodes: OntologyVertexDatum[] = nodes.filter(
    (node: OntologyVertexDatum) => {
      return !nodesToFilter.includes(node.id);
    }
  );

  /**
   * remove specified links to filtered nodes...
   * this is necessary because a node may have as a descendant
   * a node which has been filtered, in which case, things will
   * tend to explode.
   */
  const _links = links.filter((l: SimulationLinkDatum<any>) => {
    let keep = true;
    if (nodesToFilter.includes(l.source) || nodesToFilter.includes(l.target)) {
      keep = false;
    }
    /**
     * Special case remove links...
     * consider cells x y z, where x → y → z, remove links from x to z
     * these strangely exist all over the ontology as a kind of default, experiment to remove them
     * so, loop over x descendants, if a descendant of x has a link to z, remove the link
     * probably should be recursive but for first pass will skip that and start with one level
     * may not need to be recursive if the descendant also has xyz nodes to all the sub children, so,
     * accidentally, this simple algo also looks for duplicate nodes where a --> b --> c --> d --> e
     * if a and b both have links to e, the condition is met, and same for b and c both having links to e
     * so this may be enough
     */
    const parentVertex: OntologyTerm | undefined = ontology.get(l.source);
    if (parentVertex && parentVertex.descendants.length > outdegreeCutoff)
      parentVertex.descendants.forEach((descendantID: string) => {
        const descendantVertex: OntologyTerm | undefined =
          ontology.get(descendantID);

        // check if these descendants have in their own descendants members of parentVertex.descendants
        // if the descendants of the descendant include the target
        // that is, if y includes z, remove it
        if (
          descendantVertex &&
          descendantVertex.descendants.includes(l.target)
        ) {
          keep = false;
        }
      });

    return keep;
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
