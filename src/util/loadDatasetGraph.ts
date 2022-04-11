import load from "./load";
import { DatasetGraph, Ontology, OntologyName } from "../d";

/**
 * Load and initialize the dataset graph from the given URI.
 *
 * @param url - the location of the raw graph
 * @returns [graph: DatasetGraph, lattice: Ontology]
 */
export default async function loadDatasetGraph(
  url: string
): Promise<[DatasetGraph, Ontology]> {
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
 *    * ancestors is merged into .xref to make search simpler.
 *    * add descendants
 */
function createDatasetGraph(rawGraph: any): DatasetGraph {
  // Convert each ontology from Object to Map
  const datasetGraph: DatasetGraph = {
    ...rawGraph,
    ontologies: Object.fromEntries(
      Object.keys(rawGraph.ontologies).map((key: OntologyName) => [
        key,
        new Map(Object.entries(rawGraph.ontologies[key])),
      ])
    ),
  };

  // Add ID, descendants and merge ancestors into xref
  for (const ontology of Object.values(datasetGraph.ontologies)) {
    for (const [termId, term] of ontology.entries()) {
      term.id = termId;
      term.descendants = term.descendants || [];
      term.xref = [...new Set(term.xref.concat(term.ancestors))];

      for (const ancestorId of term.ancestors) {
        const ancestor = ontology.get(ancestorId);
        if (!ancestor) continue;
        if (ancestor.descendants === undefined) ancestor.descendants = [];
        ancestor.descendants.push(termId);
      }
    }
  }

  return datasetGraph;
}
