import { atom, selector } from "recoil";
import { dagDataStructureState, geneDataState } from ".";
import { OntologyVertexDatum } from "../types/graph";

export const dotplotIsOpenState = atom<boolean>({
  key: "dotplotIsOpen",
  default: false,
});

/**
 * max rows for the dotplot
 */
export const dotplotRenderThresholdState = atom<number>({
  key: "dotplotRenderThreshold",
  default: 200,
});

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

export const dotplotIsEnabledState = selector<boolean>({
  key: "dotplotIsEnabled",
  get: ({ get }) => {
    return true;
  },
});

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

export const dotplotColumnState = selector<any[] | null>({
  key: "dotplotColumns",
  get: ({ get }) => {
    const dotplotRows = get(dotplotRowState);
    const geneData = get(geneDataState);

    console.log("dotplotRows", dotplotRows);
    console.log("geneData", geneData);

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
