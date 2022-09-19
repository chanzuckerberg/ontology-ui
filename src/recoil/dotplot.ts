import { atom, selector } from "recoil";
import { currentOntologyState, dagDataStructureState } from ".";
import { geneDataState } from "./genes";
import { OntologyVertexDatum } from "../types/graph";

import { scaleLinear } from "d3-scale";

// is the dotplot drawer open?
export const dotplotIsOpenState = atom<boolean>({
  key: "dotplotIsOpen",
  default: false,
});

export const rowHighlightedState = atom<string | null>({
  key: "rowHighlighted",
  default: null,
});

// how many celltypes max, in the dotplot?
export const dotplotRenderThresholdState = atom<number>({
  key: "dotplotRenderThreshold",
  default: 200,
});

export const dotSizeMaxRadiusState = atom<number>({
  key: "dotSize",
  default: 10,
});

export const dotSizeMinRadiusState = atom<number>({
  key: "dotSizeMin",
  default: 1,
});

// are we currently under the max render threshold?
export const dotplotEnabledState = selector<boolean>({
  key: "dotplotEnabled",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);
    const dotplotRenderThreshold = get(dotplotRenderThresholdState);

    if (!dagDataStructure) {
      return false;
    } else {
      return dagDataStructure.nodes.length < dotplotRenderThreshold;
    }
  },
});

// rows in the dotplot (celltypes), and their associated data
export const dotplotRowState = selector<OntologyVertexDatum[] | null>({
  key: "dotplotRows",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);
    const dotplotEnabled = get(dotplotEnabledState);

    if (dagDataStructure && dagDataStructure.nodes && dotplotEnabled) {
      return dagDataStructure.nodes;
    } else {
      return null;
    }
  },
});

// columns in the dotplot (genes), as an array of names in format eg., 'ENSG00000196549'
export const diffexpGenesDotplotState = selector<Array<any>>({
  key: "diffexpGenesDotplot",
  get: ({ get }) => {
    const rows = get(dotplotRowState);
    const ontology = get(currentOntologyState);

    if (rows && ontology) {
      const allDiffexpGenes = rows.map((row) => {
        return ontology?.get(row.id)?.genes;
      });

      // flatten the array of arrays, remove duplicates and undefined values
      const diffexpGenes = Array.from(new Set(allDiffexpGenes.flat().filter((genes) => genes !== undefined)));

      return diffexpGenes;
    } else {
      return [];
    }
  },
});

// all of the celltypes as an array of strings like CL:0000000
export const includedCelltypesState = selector<string[]>({
  key: "includedCelltypes",
  get: ({ get }) => {
    const dotplotRows = get(dotplotRowState);

    if (dotplotRows) {
      return dotplotRows.map((row) => row.id);
    } else {
      return [];
    }
  },
});

/* 

    each gene is a pair of cell/gene that looks like this
    [
      0 "10100", index position
      1 "CL:0000065", cl term
      2 "ENSMUSG00000045658", gene id
      3 "2.2974446", mean
      4 "0.59615386", frac expressing
    ]

    mean: geneData[i][3],
    frac: geneData[i][4],
  
   */

export const includedPairsState = selector<string[][]>({
  key: "includedPairs",
  get: ({ get }) => {
    const geneData = get(geneDataState);
    const includedCelltypes = get(includedCelltypesState);
    const diffexpGenes = get(diffexpGenesDotplotState);

    const includedPairs = geneData.filter((gene: string[]) => {
      return includedCelltypes.includes(gene[1]) && diffexpGenes.includes(gene[2]);
    });

    return includedPairs;
  },
});

interface DotplotData {
  [key: string]: {
    [key: string]: {
      fracExpressing: string;
      mean: string;
    };
  };
}

// the cell / gene pairs data in the dotplot, expression values
export const dotplotState = selector<DotplotData>({
  key: "includedGenes",
  get: ({ get }) => {
    const includedPairs = get(includedPairsState);
    // return the pairs in the format { 'ENSG00000196549': { 'CL:0000000': { 'fracExpressing': 0.5, mean: 0.5 } } }
    const pairsAsObject: DotplotData = {};

    includedPairs.forEach((pair: string[]) => {
      const gene = pair[2];
      const celltype = pair[1];
      const fracExpressing = pair[4];
      const mean = pair[3];

      if (!pairsAsObject[gene]) {
        pairsAsObject[gene] = {};
      }

      pairsAsObject[gene][celltype] = {
        fracExpressing,
        mean,
      };
    });

    return pairsAsObject;
  },
});

export const dotScaleState = selector({
  key: "dotColorScale",
  get: ({ get }) => {
    const includedPairs = get(includedPairsState);
    const dotSizeMinRadius = get(dotSizeMinRadiusState);
    const dotSizeMaxRadius = get(dotSizeMaxRadiusState);

    const maxMean = Math.max(...includedPairs.map((pair) => parseFloat(pair[3])));
    const minMean = Math.min(...includedPairs.map((pair) => parseFloat(pair[3])));
    const maxFrac = Math.max(...includedPairs.map((pair) => parseFloat(pair[4])));
    const minFrac = Math.min(...includedPairs.map((pair) => parseFloat(pair[4])));

    const fracScale = scaleLinear().domain([minFrac, maxFrac]).range([dotSizeMinRadius, dotSizeMaxRadius]);
    const meanScale = scaleLinear().domain([minMean, maxMean]).range([0, 1]);

    const legend = {
      frac: {
        min: minFrac,
        max: maxFrac,
      },
      mean: {
        min: minMean,
        max: maxMean,
      },
    };

    return { fracScale, meanScale, legend };
  },
});
