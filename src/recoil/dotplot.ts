import { atom, selector } from "recoil";
import { dagDataStructureState } from ".";
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
