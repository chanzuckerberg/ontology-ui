/**
 * Ontology DAG manipulation operations.
 */

// TODO XXX: we should define the DAG types in this file, and then
// have the ontology specialize them. For now, just use the ontology
// objects directly.
import { Ontology, OntologyTerm, OntologyId, OntologyPrefix } from "../d";

/**
 * Given an ID, return its ontology, term and prefix, OR return undefined.
 */
export function ontologyLookupId(
  ontologies: Record<OntologyPrefix, Ontology>,
  id: OntologyId
): { prefix: OntologyPrefix; term: OntologyTerm; ontology: Ontology } | undefined {
  const prefix = id?.split(":", 1)?.[0];
  const ontology = ontologies?.[prefix];
  const term = ontology?.get(id);
  if (!term) return undefined;
  return { prefix, term, ontology };
}

export enum OntologyFilterAction {
  Retain = 0, // do not filter
  Remove = 1, // remove the term
  RemoveFamily = 2, // remove term and descendant terms
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

/**
 * Search/query the DAGs
 */
// query type elements
export type LinkNames = "part_of" | "have_part" | "derives_from" | "develops_from" | "children" | "parents";
const AllLinkNames: LinkNames[] = ["part_of", "have_part", "derives_from", "develops_from", "parents", "children"];
interface From {
  $from?: OntologyPrefix;
}

// query types
interface Literal {
  $: OntologyId | OntologyId[];
}
// iterate down a given link
type WalkQuery = From & {
  // maybe this should be { $walkOn: link, $from: query }
  $walk: OntologyQuery;
  $on?: LinkNames;
};
// Free text search.
type MatchQuery = From & {
  $match: string;
};
// Merge (union) of query results
type MergeQuery = From & {
  $merge: OntologyQuery[];
};
// Filter (intersect) query results
type FilterQuery = From & {
  $filter: OntologyQuery[];
};
// Join on a query with a link
type JoinQuery = From & {
  $joinOn: LinkNames | "*";
  $where: OntologyQuery;
};
type JoinTreeQuery = From & {
  $joinTreeOn: LinkNames | "*";
  $where: OntologyQuery;
};

export type OntologyQuery =
  | OntologyId
  | OntologyId[]
  | Set<OntologyId>
  | MatchQuery
  | MergeQuery
  | FilterQuery
  | JoinQuery
  | JoinTreeQuery
  | Literal
  | WalkQuery;

export function ontologyQuery(
  ontologies: Record<OntologyPrefix, Ontology>,
  query: OntologyQuery,
  from?: OntologyPrefix
): Set<OntologyId> {
  /*
   * Literals
   */
  if (typeof query === "string") return new Set([query]);
  if (Array.isArray(query)) return new Set(query);
  if (query instanceof Set) return query;
  if ("$" in query) {
    return query.$ instanceof Set ? query.$ : new Set(Array.isArray(query.$) ? query.$ : [query.$]);
  }

  // the remainder accept a change in the search ontology, aka $from
  from = query.$from || from;
  if (from === undefined) throw new Error("Missing default context for ontology search.");

  let result: Set<OntologyId>;
  if ("$walk" in query) {
    result = doWalk(ontologies, from, query);
  } else if ("$match" in query) {
    result = doMatch(ontologies, from, query);
  } else if ("$merge" in query) {
    result = doMerge(ontologies, from, query);
  } else if ("$filter" in query) {
    result = doFilter(ontologies, from, query);
  } else if ("$joinOn" in query) {
    result = doJoin(ontologies, from, query);
  } else if ("$joinTreeOn" in query) {
    result = doJoinTree(ontologies, from, query);
  } else {
    throw new Error("Unknown query structure.");
  }

  if ("$from" in query) {
    const prefix = query.$from + ":";
    for (const id of result) {
      if (!id.startsWith(prefix)) result.delete(id);
    }
  }

  return result;
}

/**
 * Return free-text matches
 */
function doMatch(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: MatchQuery
): Set<OntologyId> {
  const { $match } = query;
  const ontology = ontologies[from];
  if (!ontology || !$match) return new Set();

  const results = new Set<OntologyId>();
  // TODO: fuzzy text search
  const lowerMatch = $match.toLowerCase();
  for (const term of ontology.values()) {
    if (
      term.label.toLowerCase().includes(lowerMatch) ||
      term.id.toLowerCase().includes(lowerMatch) ||
      term.synonyms.some((s) => s.toLowerCase().includes(lowerMatch))
    ) {
      results.add(term.id);
    }
  }
  return results;
}

/**
 * Return the union of the sub-queries.
 */
function doMerge(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: MergeQuery
): Set<OntologyId> {
  const { $merge } = query;
  if (!Array.isArray($merge)) return new Set();
  const results = new Set<OntologyId>();
  for (const subQuery of $merge) {
    for (const r of ontologyQuery(ontologies, subQuery, from)) {
      results.add(r);
    }
  }
  return results;
}

function doFilter(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: FilterQuery
): Set<OntologyId> {
  const { $filter } = query;
  if (!Array.isArray($filter)) return new Set();
  let results: Set<OntologyId> | undefined;
  for (const subQuery of $filter) {
    if (results === undefined) {
      results = ontologyQuery(ontologies, subQuery, from);
    } else {
      results = intersect(results, ontologyQuery(ontologies, subQuery, from));
    }
  }
  return results ?? new Set();
}

/**
 * Return a join on another query, through a named relationship
 */
function doJoin(ontologies: Record<OntologyPrefix, Ontology>, from: OntologyPrefix, query: JoinQuery): Set<OntologyId> {
  const { $joinOn, $where } = query;
  const ontology = ontologies[from];
  if (!ontology || !$joinOn || !$where) return new Set();

  const joinIds = ontologyQuery(ontologies, $where, from);
  const results = new Set<OntologyId>();

  // TODO: this begs for an inverted index
  const joins: LinkNames[] = $joinOn === "*" ? AllLinkNames : [$joinOn];
  for (const term of ontology.values()) {
    for (const on of joins) {
      for (const joinId of joinIds) {
        if (term[on].includes(joinId)) {
          results.add(term.id);
          break;
        }
      }
    }
  }
  return results;
}

/**
 * Return descendants of the subquery
 */
function walk(ontologies: Record<OntologyPrefix, Ontology>, term: OntologyTerm, link: LinkNames): Set<OntologyId> {
  const results = new Set<OntologyId>();
  const todo: OntologyId[] = [...term[link]]; // deque
  while (todo.length > 0) {
    const id = todo.shift();
    if (id === undefined) break;
    results.add(id);
    const ids = ontologyLookupId(ontologies, id)?.term?.[link];
    if (ids) todo.push(...ids);
  }
  return results;
}

function doWalk(ontologies: Record<OntologyPrefix, Ontology>, from: OntologyPrefix, query: WalkQuery): Set<OntologyId> {
  const { $walk, $on } = query;
  if (!$walk) return new Set();
  const link: LinkNames = $on ?? "children";

  const results = new Set<OntologyId>();
  for (const query_result of ontologyQuery(ontologies, $walk, from)) {
    const term = ontologyLookupId(ontologies, query_result)?.term;
    if (!term) continue;
    results.add(term.id);

    // children and parents are pre-computed
    if (link === "children") {
      for (const id of term.descendants) {
        results.add(id);
      }
    } else if (link === "parents") {
      for (const id of term.ancestors) {
        results.add(id);
      }
    } else {
      for (const id of walk(ontologies, term, link)) {
        results.add(id);
      }
    }
  }
  return results;
}

function doJoinTree(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: JoinTreeQuery
): Set<OntologyId> {
  const { $joinTreeOn, $where } = query;
  // const ontology = ontologies[from];
  // if (!ontology || !$joinTreeOn || !$where) return new Set();
  if (!$joinTreeOn || !$where) return new Set();

  const results = new Set<OntologyId>();
  let subQuery: OntologyQuery = $where;
  do {
    const subQueryresults = ontologyQuery(ontologies, { $joinOn: $joinTreeOn, $where: subQuery }, from);
    subQuery = [];
    for (const id of subQueryresults) {
      if (!results.has(id)) subQuery.push(id);
    }
    merge(results, subQueryresults);
  } while (subQuery.length > 0);
  return results;
}

/**
 * Set ops
 */

/**
 * Return the intersection of the sets
 */
function intersect<T extends any>(A: Set<T>, B: Set<T>): Set<T> {
  let _intersection = new Set<T>();
  for (const elem of B) {
    if (A.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

/**
 * Merge sets - source into target. Mutates target.
 */
function merge<T extends any>(target: Set<T>, source: Set<T>): Set<T> {
  for (const elem of source) {
    target.add(elem);
  }
  return target;
}

/**
 * Search for UBERON and CL terms associated with a compartment.
 */
export function compartmentQuery(
  ontologies: Record<OntologyPrefix, Ontology>,
  compartmentQuery: OntologyQuery
): [Set<OntologyId>, Set<OntologyId>] {
  const compartmentRootIds = ontologyQuery(ontologies, compartmentQuery, "UBERON");
  const compartmentIds = ontologyQuery(ontologies, {
    $merge: [
      { $joinTreeOn: "part_of", $where: compartmentRootIds },
      { $walk: compartmentRootIds, $on: "have_part" },
    ],
    $from: "UBERON",
  });

  const celltypeIds = ontologyQuery(ontologies, {
    $merge: [
      { $walk: compartmentIds, $on: "have_part" },
      { $joinOn: "part_of", $where: compartmentIds },
    ],
    $from: "CL",
  });

  return [compartmentIds, celltypeIds];
}
