import { atom, selector } from "recoil";
import { dsvFormat } from "d3-dsv";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";

import { selectedGeneState } from "./controls";
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

export const geneNameConversionTableState = selector<any>({
  key: "geneNameConversionTable",
  get: async ({ get }) => {
    try {
      const response = await fetch(`./ens_gene_convert.json`);
      const data = await response.json();

      let geneNameConversionTable = null;

      if (data && data.gene_terms && data.gene_terms["NCBITaxon:9606"]) {
        geneNameConversionTable = new Map(
          data.gene_terms["NCBITaxon:9606"].map((name: any) => {
            const ensToGenePair = Object.entries(name)[0];
            return [ensToGenePair[0], ensToGenePair[1]];
          })
        );
      }

      return geneNameConversionTable;
    } catch (error) {
      throw error;
    }
  },
});

export const geneDataState = selector<any>({
  key: "geneData",
  get: async ({ get }) => {
    try {
      const response = await fetch(`./gene_data_filtered.tsv`, {
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "utf-8",
        },
      });

      const csvString = await response.text();
      // index,cell_type,gene_id,mean,frac
      const geneData = dsvFormat(",").parseRows(csvString);

      return geneData.slice(1);
    } catch (error) {
      throw error;
    }
  },
});

export const selectedGeneExpressionState = selector<any>({
  key: "selectedGeneExpression",
  get: ({ get }) => {
    const selectedGene = get(selectedGeneState);
    const geneData = get(geneDataState);

    if (selectedGene && geneData) {
      const colorByData: any = {};
      const means: number[] = [];

      for (let i = 0; i < geneData.length; i++) {
        if (geneData[i][2] === selectedGene) {
          colorByData[geneData[i][1]] = {
            mean: geneData[i][3],
            frac: geneData[i][4],
          };
          means.push(geneData[i][3]);
        }
      }

      const _extent: any = extent(means);

      colorByData["expressionRange"] = _extent;
      colorByData["geneExpressionColorScale"] = scaleLinear().domain(_extent).range([0, 1]);

      return colorByData;
    } else {
      return null;
    }
  },
});
