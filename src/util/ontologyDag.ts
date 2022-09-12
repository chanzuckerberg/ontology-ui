/**
 * Ontology DAG manipulation operations.
 */

// TODO XXX: we should define the DAG types in this file, and then
// have the ontology specialize them. For now, just use the ontology
// objects directly.
import { Ontology, OntologyTerm, OntologyId, OntologyPrefix } from "../types/d";

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
 * ontologySubDAG - create a new DAG(s) which contains the specified subset
 */
export function ontologySubset(ontology: Ontology, subsetIds: Set<OntologyId>): Ontology {
  const subDag = new Map<OntologyId, OntologyTerm>();
  for (const cid of subsetIds) {
    const term = ontology.get(cid);
    if (!term) continue;
    subDag.set(cid, {
      ...term,
      parents: term.parents.filter((id) => subsetIds.has(id)),
      children: term.children.filter((id) => subsetIds.has(id)),
      ancestors: new Set([...term.ancestors].filter((id) => subsetIds.has(id))),
      descendants: new Set([...term.descendants].filter((id) => subsetIds.has(id))),
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
type Literal = From & {
  $: "all" | "none";
};
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
// Union of query results
type UnionQuery = From & {
  $union: OntologyQuery[];
};
// Intersect query results
type IntersectQuery = From & {
  $intersect: OntologyQuery[];
};
// Difference of query results
type DifferenceQuery = From & {
  $difference: OntologyQuery[];
};
// Join on a query with a link
type JoinQuery = From & {
  $joinOn: LinkNames | "*";
  $where: OntologyQuery;
};
type JoinTreeQuery = From & {
  // Maybe this should use the term "walk" rather than "tree"?
  $joinTreeOn: LinkNames | "*";
  $where: OntologyQuery;
};

export type OntologyQuery =
  | OntologyId
  | OntologyId[]
  | Set<OntologyId>
  | MatchQuery
  | UnionQuery
  | IntersectQuery
  | DifferenceQuery
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

  // the remainder accept a change in the search ontology, aka $from
  from = query?.$from ?? from;
  if (from === undefined) throw new Error("Missing default context for ontology search.");

  let result: Set<OntologyId>;
  if ("$" in query) {
    result = doLiteral(ontologies, from, query);
  } else if ("$walk" in query) {
    result = doWalk(ontologies, from, query);
  } else if ("$match" in query) {
    result = doMatch(ontologies, from, query);
  } else if ("$union" in query) {
    result = doUnion(ontologies, from, query);
  } else if ("$intersect" in query) {
    result = doIntersect(ontologies, from, query);
  } else if ("$difference" in query) {
    result = doDifference(ontologies, from, query);
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

function doLiteral(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: Literal
): Set<OntologyId> {
  const { $ } = query;
  const ontology = ontologies[from];
  if (!ontology || !$) return new Set();
  if ($ === "none") return new Set();
  if ($ === "all") return new Set(ontology.keys());
  throw new Error("Unknown query literal.");
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
function doUnion(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: UnionQuery
): Set<OntologyId> {
  const { $union } = query;
  if (!Array.isArray($union)) return new Set();
  const results = new Set<OntologyId>();
  for (const subQuery of $union) {
    for (const r of ontologyQuery(ontologies, subQuery, from)) {
      results.add(r);
    }
  }
  return results;
}

/**
 * Intersection of queries
 */
function doIntersect(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: IntersectQuery
): Set<OntologyId> {
  const { $intersect } = query;
  if (!Array.isArray($intersect)) return new Set();
  let results: Set<OntologyId> | undefined;
  for (const subQuery of $intersect) {
    if (results === undefined) {
      results = ontologyQuery(ontologies, subQuery, from);
    } else {
      results = intersect(results, ontologyQuery(ontologies, subQuery, from));
    }
  }
  return results ?? new Set();
}

/**
 * Difference of queries
 */
function doDifference(
  ontologies: Record<OntologyPrefix, Ontology>,
  from: OntologyPrefix,
  query: DifferenceQuery
): Set<OntologyId> {
  const { $difference } = query;
  if (!Array.isArray($difference)) return new Set();
  let results: Set<OntologyId> | undefined;
  for (const subQuery of $difference) {
    if (results === undefined) {
      results = ontologyQuery(ontologies, subQuery, from);
    } else {
      results = difference(results, ontologyQuery(ontologies, subQuery, from));
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
  if (!$joinTreeOn || !$where) return new Set();

  const results = new Set<OntologyId>();
  let subQuery: OntologyQuery = $where;
  do {
    const subQueryresults = ontologyQuery(ontologies, { $joinOn: $joinTreeOn, $where: subQuery }, from);
    subQuery = [];
    for (const id of subQueryresults) {
      if (!results.has(id)) subQuery.push(id);
    }
    union(results, subQueryresults);
  } while (subQuery.length > 0);
  return results;
}

/**
 * Search for UBERON and CL terms associated with a compartment.
 */
export function createCompartmentQuery(baseQuery: OntologyQuery): OntologyQuery {
  const compartmentQuery: OntologyQuery = {
    $union: [
      { $joinTreeOn: "part_of", $where: baseQuery },
      { $walk: baseQuery, $on: "have_part" },
    ],
    $from: "UBERON",
  };
  return {
    $union: [
      { $walk: compartmentQuery, $on: "have_part" },
      { $joinOn: "part_of", $where: compartmentQuery },
    ],
    $from: "CL",
  };
}

/**
 * Perform compartment query.
 */
export function compartmentQuery(
  ontologies: Record<OntologyPrefix, Ontology>,
  baseQuery: OntologyQuery
): Set<OntologyId> {
  return ontologyQuery(ontologies, createCompartmentQuery(baseQuery));
}

/**
 * Set ops primitives
 */

/**
 * Return the intersection of the sets
 */
function intersect<T extends any>(A: Set<T>, B: Set<T>): Set<T> {
  if (A.size < B.size) [A, B] = [B, A];
  let _intersection = new Set<T>();
  for (const elem of B) {
    if (A.has(elem)) {
      _intersection.add(elem);
    }
  }
  return _intersection;
}

/**
 * Union/merge sets - source into target. NOTE: mutates target.
 */
function union<T extends any>(target: Set<T>, source: Set<T>, inplace: boolean = false): Set<T> {
  const _union = inplace ? target : new Set(target);
  for (const elem of source) {
    _union.add(elem);
  }
  return _union;
}

/**
 * Set difference
 */
function difference<T extends any>(left: Set<T>, right: Set<T>): Set<T> {
  const _difference = new Set<T>(left);
  for (const elem of right) {
    _difference.delete(elem);
  }
  return _difference;
}
