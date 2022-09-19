import { atom, selector } from "recoil";

import { DagStateNodesLinksStrat } from "../types/graph";
import { DatasetGraph, Ontology } from "../types/d";
import { createDatasetGraph, createLattice } from "../util/loadDatasetGraph";

export const dagDataStructureState = atom<DagStateNodesLinksStrat | null>({
  key: "dagDataStructure",
  default: null,
});

// a recoil atom that syncs the url
export const urlState = atom<any | null>({
  key: "urlParams",
  default: null,
});

export const graphState = selector<any>({
  key: "rawGraph",
  get: async ({ get }) => {
    try {
      const response = await fetch("/dataset_graph.json");
      const data = await response.json();

      const graph: DatasetGraph = createDatasetGraph(data);
      const lattice: Ontology = createLattice(graph);

      return [graph, lattice];
    } catch (error) {
      throw error;
    }
  },
});

export const currentOntologyState = selector<Ontology | null>({
  key: "currentOntology",
  get: ({ get }) => {
    const [graph] = get(graphState);
    const url = get(urlState);

    if (!graph || !url?.ontoID) return null;

    return graph?.ontologies[url.ontoID];
  },
});
