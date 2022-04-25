import load from "./load";
import { DatasetGraph, Ontology, OntologyId, OntologyPrefix, OntologyTerm } from "../d";

/**
 * Load and initialize the dataset graph from the given URI.
 *
 * @param url - the location of the raw graph
 * @returns [graph: DatasetGraph, lattice: Ontology]
 */
export default async function loadDatasetGraph(url: string): Promise<[DatasetGraph, Ontology]> {
  const rawGraph = await load("/dataset_graph.json");
  const datasetGraph: DatasetGraph = createDatasetGraph(rawGraph);
  const lattice: Ontology = createLattice(datasetGraph);
  return [datasetGraph, lattice];
}

/**
 * Create the lattice -- the flattened map of all terms, used
 * for quick & easy search.
 */
function createLattice(datasetGraph: DatasetGraph): Ontology {
  return new Map(
    (function* () {
      for (const ontology of Object.values(datasetGraph.ontologies)) {
        yield* ontology;
      }
    })()
  );
}

/**
 * Create the DatasetGraph for internal use, from the raw graph provided
 * by the OTA service.  Transformations performed:
 *  * Each ontology is saved as a Map object
 *  * For each OntologyTerm:
 *    * add the ID to the object (so it can be used independent of the ontology)
 *    * create `ancestors`
 *    * parents is merged into .xref to make search simpler.
 *    * add children
 */
function createDatasetGraph(rawGraph: any): DatasetGraph {
  // Convert each ontology from Object to Map
  const datasetGraph: DatasetGraph = {
    ...rawGraph,
    ontologies: Object.fromEntries(
      Object.keys(rawGraph.ontologies).map((key: OntologyPrefix) => [
        key,
        new Map(Object.entries(rawGraph.ontologies[key])),
      ])
    ),
  };

  // Add ID, children, ancestors, descendants and xref
  //
  // CAUTION: relations (eg, children) are accumulated incrementally, and only
  // the `parent` is correct prior to the completion of this loop.
  //
  for (const ontology of Object.values(datasetGraph.ontologies)) {
    for (const [termId, term] of ontology.entries()) {
      term.id = termId;
      term.children = term.children || [];
      term.descendants = term.descendants || new Set<OntologyId>();

      accumChildren(ontology, term);
      createAncestors(ontology, term);
      accumDescendants(ontology, term);

      // consolidate searchable terms in one set.
      // XXX - TODO - needs updating once we finalize data model (eg, part_of, ...)
      term.xref = [...term.part_of, ...term.derives_from, ...term.develops_from];

      if (term.n_cells === undefined) term.n_cells = 0;
    }

    // mark all in-use terms
    for (const term of ontology.values()) {
      term.in_use = !!term.n_cells || [...term.descendants].some((id) => ontology.get(id)!.n_cells > 0);
    }
  }

  return datasetGraph;
}

/**
 * Add our ID to our immediate parent's children[].
 *
 * @param ontology
 * @param term
 */
function accumChildren(ontology: Ontology, term: OntologyTerm): void {
  for (const parentId of term.parents) {
    const parent = ontology.get(parentId);
    if (!parent) throw new Error(`Error: ${parentId} does not exist in ontology.`);
    if (parent.children === undefined) parent.children = [];
    parent.children.push(term.id);
  }
}

/**
 * Add our ID to our ancestral term descendants set.
 *
 * @param ontology
 * @param term
 */
function accumDescendants(ontology: Ontology, term: OntologyTerm): void {
  const id = term.id;
  const todo = [...term.parents];
  while (todo.length > 0) {
    const ancestorId = todo.shift();
    if (!ancestorId) continue;
    const ancestor = ontology.get(ancestorId);
    if (!ancestor) throw new Error(`Error: ${ancestorId} does not exist in ontology.`);
    if (ancestor.descendants === undefined) ancestor.descendants = new Set<OntologyId>();
    ancestor.descendants.add(id);
    todo.push(...ancestor.parents);
  }
}

/**
 * For a given term in the ontology, create ancestors. As side-effect,
 * will create ancestors set on all ancestors of this node.
 */
function createAncestors(ontology: Ontology, term: OntologyTerm): void {
  if (term.ancestors) return;
  let ancestors = new Set<OntologyId>(term.parents);
  for (const parentId of term.parents) {
    const parent = ontology.get(parentId);
    if (!parent) {
      throw new Error(`Error: ${parentId} does not exist in ontology.`);
    }
    createAncestors(ontology, parent);
    ancestors = accumInto(ancestors, parent.ancestors);
  }
  term.ancestors = ancestors;
  return;
}

/**
 * Add the contents of `source` into `target`. *Mutates* `target`.
 */
function accumInto<T extends any>(target: Set<T>, source: Set<T>): Set<T> {
  for (const elem of source) {
    target.add(elem);
  }
  return target;
}
