import { atom, selector } from "recoil";

import { DagStateNodesLinksStrat, OntologyVertexDatum } from "../types/graph";
import { DatasetGraph, Ontology } from "../types/d";
import { createDatasetGraph, createLattice } from "../util/loadDatasetGraph";

import isProd from "../util/isProd";

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
      const response = await fetch("./dataset_graph.json");
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

// just the nodes in the dag, useful for dotplot and umap as intermediate structure
export const dagDataStructureNodesState = selector<OntologyVertexDatum[] | null>({
  key: "dagDataStructureNodes",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);

    if (dagDataStructure && dagDataStructure.nodes) {
      return dagDataStructure.nodes;
    } else {
      return null;
    }
  },
});

// all of the current selection celltypes as an array of strings like CL:0000000
export const currentCelltypesState = selector<string[]>({
  key: "currentCelltypes",
  get: ({ get }) => {
    const currentCelltypes = get(dagDataStructureNodesState);

    if (currentCelltypes) {
      return currentCelltypes.map((row) => row.id);
    } else {
      return [];
    }
  },
});
