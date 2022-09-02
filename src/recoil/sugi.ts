import { atom, selector } from "recoil";
import { dagStratify, sugiyama } from "d3-dag/dist";
import { DagStateNodesLinksStrat } from "../components/OntologyExplorer/types";

interface LayoutState {
  nodeRadius: number;
  layeringChoice: string;
  decrossingsChoice: string;
  coordsChoice: string;
  scaleMultiplier: number;
  sugiyamaWidthAspectRatio: number | null;
  sugiyamaHeightAspectRatio: number | null;
}

export const dagDataStructureState = atom<DagStateNodesLinksStrat | null>({
  key: "dagDataStructure",
  default: null,
});

export const sugiyamaIsEnabledState = selector<boolean>({
  key: "sugiyamaIsEnabled",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);
    const sugiyamaRenderThreshold = get(sugiyamaRenderThresholdState);

    return (
      dagDataStructure?.sugiyamaStratifyData && dagDataStructure?.sugiyamaStratifyData.length < sugiyamaRenderThreshold
    );
  },
});

export const sugiyamaRenderThresholdState = atom<number>({
  key: "sugiyamaRenderThreshold",
  default: 200,
});

export const dagState = selector<any | null>({
  key: "sugiyamaDagState",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);

    if (!dagDataStructure) return null;

    /**
     * Initialize stratify data operator
     * https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.ConnectOperator.html
     */
    const _createDagStructure = dagStratify();

    /**
     * transform data to d3-dag preferred format
     */
    return _createDagStructure(dagDataStructure.sugiyamaStratifyData);
  },
});

export const layoutState = selector<LayoutState>({
  key: "sugiyamaLayoutState",
  get: ({ get }) => {
    const dag = get(dagState);
    let _width = null;
    let _height = null;

    if (dag) {
      /**
       * Initialize d3-dag layout operator
       */
      const _sugiyamaLayout = sugiyama();

      /**
       * pass the data structure to the layout generator
       */
      const { width, height } = _sugiyamaLayout(dag); // error is here

      _width = width;
      _height = height;
    }

    return {
      nodeRadius: 10,
      layeringChoice: "Simplex (slow)",
      decrossingsChoice: "Optimal (slow)",
      coordsChoice: "Quad (slow)",
      scaleMultiplier: 110,
      sugiyamaWidthAspectRatio: _width,
      sugiyamaHeightAspectRatio: _height,
    };
  },
});
