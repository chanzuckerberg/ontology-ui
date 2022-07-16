import load from "./load";
import { DatasetGraph, Ontology, OntologyId, OntologyPrefix, OntologyTerm } from "../d";

/**
 * Load and initialize the dataset graph from the given URI.
 *
 * @param url - the location of the raw graph
 * @returns [graph: DatasetGraph, lattice: Ontology]
 */
export default async function loadDatasetGraph(url: string): Promise<[DatasetGraph, Ontology]> {
  const rawGraph = await load(url);
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
    depthMaps: Object.fromEntries(
      Object.keys(rawGraph.ontologies).map((key: OntologyPrefix) => [
        key,
        new Map<string,number>(),
      ])
    ),
    heightMaps: Object.fromEntries(
      Object.keys(rawGraph.ontologies).map((key: OntologyPrefix) => [
        key,
        new Map<string,number>(),
      ])
    )    
  };
  // Add ID, children, ancestors, descendants and xref
  //
  // CAUTION: relations (eg, children) are accumulated incrementally, and only
  // the `parent` is correct prior to the completion of this loop.
  //
  for (const [prefix,ontology] of Object.entries(datasetGraph.ontologies)) {

    for (const [termId, term] of ontology.entries()) {
      // set all defaults
      term.id = termId;
      term.synonyms = term.synonyms || [];
      term.children = term.children || [];
      term.descendants = term.descendants || new Set<OntologyId>();
      term.deprecated = term.deprecated || false;
      term.parents = term.parents || [];
      term.part_of = term.part_of || [];
      term.have_part = term.have_part || [];
      term.develops_from = term.develops_from || [];
      term.derives_from = term.derives_from || [];
      if (term.depth === undefined) term.depth = -1;
      if (term.n_cells === undefined) term.n_cells = 0;
    }

    for (const term of ontology.values()) {
      accumChildren(ontology, term);
      createAncestors(ontology, term);
      accumDescendants(ontology, term);

      // consolidate searchable terms in one set.
      // XXX - TODO - needs updating once we finalize data model (eg, part_of, ...)
      term.xref = [...term.part_of, ...term.derives_from, ...term.develops_from];
    }

    // mark all in-use terms
    for (const term of ontology.values()) {
      term.in_use = !!term.n_cells || [...term.descendants].some((id) => ontology.get(id)!.n_cells > 0);
    }
    const rootKeys = [...ontology].filter(([_,v])=>v.parents?.length===0).map(([k,_])=>k);    
    rootKeys.forEach((key)=>{
      const rootTerm = ontology.get(key);  
      if (rootTerm) {
        calcDepthBFS(ontology, rootTerm, datasetGraph.depthMaps[prefix])
        calcHeightDFS(ontology, rootTerm, datasetGraph.heightMaps[prefix])        
      }
    })
  }
  return datasetGraph;
}
/**
 * Calculate depth of a node in the ontology
 *
 * @param ontology
 * @param term
 */
function calcDepthBFS(ontology: Ontology, term: OntologyTerm, depthMap: Map<string,number>): void {
  const stack = [...term.children];
  const depthStack: number[] = new Array(stack.length);
  depthStack.fill(1);
  depthMap.set(term.id,0);
  if (term.depth===-1) term.depth=0;
  while ( stack.length > 0 ) {
    const id = stack.pop();
    const depth = depthStack.pop();
    if (id && depth) {
      const newTerm = ontology.get(id);
      if (newTerm) {
        if (newTerm.depth === -1) newTerm.depth = depth;
        const newDepths = new Array(newTerm.children.length);
        newDepths.fill(depth+1);
        stack.push(...newTerm.children);        
        depthStack.push(...newDepths);
        if (!depthMap.has(newTerm.id)) depthMap.set(newTerm.id, depth)
      }
    }
  }
}

function calcHeightDFS(ontology: Ontology, term: OntologyTerm, heightMap: Map<string,number>): number {
  const heights = [];
  for (const child of term.children) {
    const childTerm = ontology.get(child);
    if (childTerm) heights.push(calcHeightDFS(ontology, childTerm, heightMap)+1);
  }
  const val = heights.length > 0 ? Math.max(...heights) : 0;
  if (heightMap.has(term.id)) {
    heightMap.set(term.id, Math.max(heightMap.get(term.id) ?? 0,val))
  } else {
    heightMap.set(term.id, val)
  }
  
  return val;
  
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
