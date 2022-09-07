import { atom, selector } from "recoil";
import { Dag, dagStratify, sugiyama } from "d3-dag/dist";
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

/**
 * don't render the sugiyama unless nodes array length is less than n
 *
 * ie., has to be a subset of the overall graph
 *
 * this is here because rendering a sugiyama at 3000 nodes would be super messy
 * and there's no guarantee it would even finish because what the algo is doing
 * is computing optimal 'de-crossings', and the more nodes the greater the crossings,
 * where crossings is defined as some 'good enough' minimization of the number of edges
 * that overlap
 */
export const sugiyamaRenderThresholdState = atom<number>({
  key: "sugiyamaRenderThreshold",
  default: 200,
});

interface SugiyamaNode {
  id: string;
  parentIds: string[];
}

export const sugiyamaDagStratifiedState = selector<Dag<SugiyamaNode, unknown> | null>({
  key: "sugiyamaDagStratifiedState",
  get: ({ get }) => {
    const dagDataStructure = get(dagDataStructureState);

    if (!dagDataStructure) return null;

    console.log("dag data structure sugiyama stratify", dagDataStructure.sugiyamaStratifyData);
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

export const sugiyamaLayoutState = selector<LayoutState>({
  key: "sugiyamaLayoutState",
  get: ({ get }) => {
    const sugiyamaDagStratified = get(sugiyamaDagStratifiedState);
    let _width = null;
    let _height = null;

    if (sugiyamaDagStratified) {
      /**
       * Initialize d3-dag layout operator
       */
      const _sugiyamaLayout = sugiyama();

      /**
       * pass the data structure to the layout generator
       */
      const { width, height } = _sugiyamaLayout(sugiyamaDagStratified);

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
