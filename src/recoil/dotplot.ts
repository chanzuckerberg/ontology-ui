import { atom, selector } from "recoil";
import { dagDataStructureState, geneDataState } from ".";
import { OntologyVertexDatum } from "../types/graph";

// is the dotplot drawer open?
export const dotplotIsOpenState = atom<boolean>({
  key: "dotplotIsOpen",
  default: false,
});

// how many celltypes max, in the dotplot?
export const dotplotRenderThresholdState = atom<number>({
  key: "dotplotRenderThreshold",
  default: 200,
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

// all of the cell types in the dotplot, and their associated data
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

// all of the celltypes as a list of strings like CL:0000000
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

// all of the cell / gene pairs data in the dotplot, expression values
export const dotsState = selector<string[][]>({
  key: "includedGenes",
  get: ({ get }) => {
    const geneData = get(geneDataState);
    const includedCelltypes = get(includedCelltypesState);

    const includedGenes = geneData.filter((gene: string[]) => {
      return includedCelltypes.includes(gene[1]);
    });

    return includedGenes;
  },
});

// a selector which contains a deduplicated list of genes
export const includedGeneNamesState = selector<string[]>({
  key: "includedGeneNames",
  get: ({ get }) => {
    const includedGenes = get(dotsState);

    // deduplicate the gene names
    const allIncludedNames = includedGenes.map((gene) => gene[2]);
    console.log("included gene names in recoil", allIncludedNames);

    const deduplicatedNames = [...new Set(allIncludedNames)];

    console.log("deduplicated", deduplicatedNames);

    return [];
  },
});

export const dotplotColumnState = selector<any[] | null>({
  key: "dotplotColumns",
  get: ({ get }) => {
    const dotplotRows = get(dotplotRowState);
    const geneData = get(geneDataState);

    return null;
  },
});

/* 

    each gene looks like this. it's a pair of cell/gene
    [
      0 "10100", index position
      1 "CL:0000065", cl term
      2 "ENSMUSG00000045658", gene id
      3 "2.2974446", mean
      4 "0.59615386", frac expressing
    ]

    mean: geneData[i][3],
    frac: geneData[i][4],
  

   const _justCellIDs: string[] = [];

   dotplotRows?.forEach((row) => {
     _justCellIDs.push(row.id);
   });
 
   console.log("dotplotrows", _justCellIDs);
 
   const includedPairs = [];
 
   geneData.forEach((gene: []) => {});

   */
