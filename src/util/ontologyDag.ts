/**
 * Ontology DAG manipulation operations
 */

// TODO XXX: we should define the DAG types in this file, and then
// have the ontology specialize them.
import { Ontology, OntologyTerm, OntologyId } from "../d";

export enum OntologyFilterAction {
  Retain = 0, // do not filter
  Remove = 1, // remove the term
  RemoveFamily = 2, //
}

export type OntologyFilter = (term: OntologyTerm) => OntologyFilterAction;

/**
 * Filter the ontology, return a modified copy (does not mutate the original). The parent, child,
 * ancestors, and descendant attributes will be updated if nodes are removed.
 *
 * The filter function signature:  (term: OntologyTerm) => OntologyFilterAction
 *
 * CAUTION: relationship links to this node are NOT removed, eg, `part_of` links may still exist
 * pointing at the removed node.
 *
 * @param ontology - the ontology to filter
 * @param filterFn - the filter function called per node
 */
export function ontologyFilter(ontology: Ontology, filterFn: OntologyFilter): Ontology {
  const onto = new Map(ontology);

  // iterate over the original as we are mutating the copy
  for (const [id, term] of ontology.entries()) {
    const action = filterFn(term);

    if (action === OntologyFilterAction.Retain) continue;

    deleteId(onto, id);
    if (action === OntologyFilterAction.RemoveFamily) {
      // remove all children.
      for (const descendantId in term.descendants.values()) {
        deleteId(onto, descendantId);
      }
    }
  }

  return onto;
}

function deleteId(ontology: Ontology, id: OntologyId): void {
  const term = ontology.get(id);
  if (!term) return;

  ontology.delete(id);

  // Remove our ID from all ancestor/descendant terms
  const { ancestors, descendants } = term;
  for (const ancestorId of ancestors) {
    const ancestor = ontology.get(ancestorId);
    if (!ancestor) continue;
    ontology.set(ancestorId, {
      ...ancestor,
      children: ancestor.children.filter((cid) => cid !== id),
      descendants: new Set([...ancestor.descendants].filter((cid) => cid !== id)),
    });
  }

  for (const descendantId of descendants) {
    const descendant = ontology.get(descendantId);
    if (!descendant) continue;
    ontology.set(descendantId, {
      ...descendant,
      parents: descendant.parents.filter((cid) => cid !== id),
      ancestors: new Set([...descendant.ancestors].filter((cid) => cid !== id)),
    });
  }
}

/**
 * ontologySubDAG - create a new DAG(s) which is the sub-DAG rooted at the
 * given terms.
 */
export function ontologySubDAG(ontology: Ontology, rootIds: OntologyId[]): Ontology {
  const subDag = new Map<OntologyId, OntologyTerm>();
  rootIds = rootIds.filter((id) => ontology.get(id) !== undefined);
  if (rootIds.length === 0) return subDag;
  const subDagIds = new Set(rootIds.flatMap((id) => [id, ...(ontology.get(id)?.descendants ?? [])]));
  for (const cid of subDagIds) {
    const term = ontology.get(cid);
    if (!term) continue;
    subDag.set(cid, {
      ...term,
      parents: term.parents.filter((id) => subDagIds.has(id)),
      ancestors: new Set([...term.ancestors].filter((id) => subDagIds.has(id))),
    });
  }

  return subDag;
}
