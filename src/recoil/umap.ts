import { atom, selector } from "recoil";
import { geneDataState } from "./genes";
import { UMAP } from "umap-js";

import { Vectors } from "umap-js/dist/umap";
import { currentCelltypesState, dagDataStructureState } from ".";

export const umapThresholdState = atom({
  key: "umapThresholdState",
  default: 200,
});

export const umapEnabledState = selector({
  key: "umapEnabledState",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);
    const umapThreshold = get(umapThresholdState);
    if (!dagDataStructure) {
      return false;
    } else {
      return dagDataStructure.nodes.length < umapThreshold;
    }
  },
});

export const umapVectorState = selector<Vectors | null>({
  key: "vectorsForUmap",
  get: ({ get }) => {
    const umapEnabled = get(umapEnabledState);
    const geneData = get(geneDataState);
    const dagDataStructure = get(dagDataStructureState); // we always umap the current selection based on filters
    const currentCelltypes = get(currentCelltypesState);

    if (!dagDataStructure || !geneData || !umapEnabled || !currentCelltypes) return null;

    dagDataStructure?.nodes.forEach((node) => {
      if (node.n_cells === 0) {
        return null;
      } else {
        console.log(node.id);
        // do stuff
      }
    });

    const currentGeneData = geneData.filter((pair) => {
      return currentCelltypes.includes(pair[1]);
    });

    const relevantGenesList = Array.from(new Set(currentGeneData.map((pair) => pair[2])));

    /* 

        the format of currentGeneData is: 

        [
            [
                "10100", 
                "CL:0000065", 
                "ENSMUSG00000045658",
                "2.2974446", 
                "0.59615386", 
            ],
            ...
        ]

        where the first element is the cell id, the second is the cell type, the third is the gene id, and the fourth and fifth are the log fold change mean expression and fraction expressing

        now we construct gene expression vectors for each celltype, which is an array of arrays of numbers.
        the order of the sub arrays is the same as the order of currentCellTypes, and 
        the order of the numbers in each sub array is the same as the order of relevantGenesList

        so for example, if we have 3 celltypes and 4 genes, we might have something like this:

        [
            [0.1, 0.2, 0.3, 0.4],
            [0.5, 0.6, 0.7, 0.8],
            [0.9, 1.0, 1.1, 1.2]
        ]

        where the first number in each sub array is the expression of the first gene in relevantGenesList

        this is the format that umap-js expects

        first we build an index for the row and column ids, which will be two maps:
        
        first a map from celltype to number (offset) 
        second a map for gene to number (offset)

        next, we'll initialize the vectors with zeros
        
        finally, we'll do a giant for loop going through currentGeneData to fill in the sparse matrix

    */

    const celltypeIndex = new Map<string, number>();
    const geneIndex = new Map<string, number>();

    currentCelltypes.forEach((celltype, i) => {
      celltypeIndex.set(celltype, i);
    });

    relevantGenesList.forEach((gene, i) => {
      geneIndex.set(gene, i);
    });

    const vectors: Vectors = new Array(currentCelltypes.length).fill(0).map(() => {
      return new Array(relevantGenesList.length).fill(0);
    });

    currentGeneData.forEach((pair) => {
      const celltype = pair[1];
      const gene = pair[2];
      const expression = pair[3];

      const celltypeOffset = celltypeIndex.get(celltype);
      const geneOffset = geneIndex.get(gene);

      if (celltypeOffset === undefined || geneOffset === undefined) {
        throw new Error("celltype or gene not found in index");
      }

      vectors[celltypeOffset][geneOffset] = parseFloat(expression);
    });

    return vectors;
  },
});

export const umapEmbeddingState = selector<number[][] | null>({
  key: "umapEmbeddingState",
  get: ({ get }) => {
    const umapVectors = get(umapVectorState);

    if (!umapVectors) return null;

    const embedding = new UMAP({
      // nComponents: 2,
      // minDist: 0.1,
      // nNeighbors: 15,
    }).fit(umapVectors);

    console.log("embedding", embedding);

    return embedding;
  },
});
