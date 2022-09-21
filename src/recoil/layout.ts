import { atom, selector } from "recoil";

export const windowDimensionsState = atom<{ width: number; height: number } | null>({
  key: "windowDimensions",
  default: null,
});

export const graphLayoutDimensionsState = selector<{
  graphContainerWidth: number;
  graphContainerHeight: number;
} | null>({
  key: "graphLayoutDimensions",
  get: ({ get }) => {
    const windowDimensions = get(windowDimensionsState);
    if (!windowDimensions) return null;
    const { width, height } = windowDimensions;
    return {
      graphContainerWidth: width - 800,
      /**
       * 800 is the width of the sidebar
       * 50 is the height of the menubar
       * 16 is just a little padding
       */
      graphContainerHeight: height - 50 - 16,
    };
  },
});
