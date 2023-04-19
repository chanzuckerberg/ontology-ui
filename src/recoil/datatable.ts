import { atom, selector } from "recoil";
import { dagDataStructureState } from ".";

export const dataTableIsOpenState = atom<boolean>({
  key: "dataTableIsOpen",
  default: false,
});

// how many celltypes max, in the dotplot?
export const dataTableRenderThresholdState = atom<number>({
  key: "dataTableRenderThreshold",
  default: 200,
});

// are we currently under the max render threshold?
export const dataTableEnabledState = selector<boolean>({
  key: "dataTableEnabled",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);
    const dotplotRenderThreshold = get(dataTableRenderThresholdState);

    if (!dagDataStructure) {
      return false;
    } else {
      return dagDataStructure.nodes.length < dotplotRenderThreshold;
    }
  },
});
