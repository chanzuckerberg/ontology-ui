import { useState, useEffect } from "react";
import { sugiyama, Dag, dagStratify } from "d3-dag/dist";
import { line, curveCatmullRom } from "d3-shape";

import { scaleLinear } from "d3-scale";

import { Ontology } from "../../d";

interface SugiyamaNode {
  id: string;
  parentIds: string[];
}

interface SugiyamaProps {
  sugiyamaStratifyData: SugiyamaNode[];
  ontology: Ontology;
}

interface LayoutState {
  nodeRadius: number;
  layeringChoice: string;
  decrossingsChoice: string;
  coordsChoice: string;
  scaleMultiplier: number;
  sugiyamaWidthAspectRatio: number | null;
  sugiyamaHeightAspectRatio: number | null;
}

const defaultLayoutState: LayoutState = {
  nodeRadius: 10,
  layeringChoice: "Simplex (slow)",
  decrossingsChoice: "Optimal (slow)",
  coordsChoice: "Quad (slow)",
  scaleMultiplier: 110,
  sugiyamaWidthAspectRatio: null,
  sugiyamaHeightAspectRatio: null,
};

export default function Sugiyama({ ontology, sugiyamaStratifyData }: SugiyamaProps): JSX.Element | null {
  const [dag, setDag] = useState<Dag<SugiyamaNode, unknown>>();
  const [layout, setLayout] = useState<LayoutState>(defaultLayoutState);

  useEffect(() => {
    /**
     * Initialize stratify data operator
     * https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.ConnectOperator.html
     */
    const _createDagStructure = dagStratify();

    /**
     * transform data to d3-dag preferred format
     */
    const dag: Dag<SugiyamaNode, unknown> = _createDagStructure(sugiyamaStratifyData);

    setDag(dag);
  }, [sugiyamaStratifyData]);

  useEffect(() => {
    if (dag) {
      /**
       * Initialize d3-dag layout operator
       */
      const _sugiyamaLayout = sugiyama();

      /**
       * pass the data structure to the layout generator
       */
      const _layout = _sugiyamaLayout(dag); // error is here

      const { width, height } = _layout;
      setLayout((s) => ({ ...s, sugiyamaWidthAspectRatio: width, sugiyamaHeightAspectRatio: height }));
    }
  }, [dag]);

  const { sugiyamaWidthAspectRatio, sugiyamaHeightAspectRatio, scaleMultiplier, nodeRadius } = layout;
  if (!dag || !sugiyamaWidthAspectRatio || !sugiyamaHeightAspectRatio) return null;

  const createLine = line()
    .curve(curveCatmullRom)
    .x((d: any) => d.x * scaleMultiplier)
    .y((d: any) => d.y * scaleMultiplier + Math.random());

  /**
   * Sizes
   */
  let nodeSize: number = 5;
  let deemphasizeNodeSize: number = 2.5;

  /* scales */

  const minNodeRadius = 5;
  const maxNodeRadius = 25;

  const cellCountWhale: number = 1000000;
  const cellCountShrimp: number = 1;
  const nCellsScale = scaleLinear().domain([cellCountShrimp, cellCountWhale]).range([minNodeRadius, maxNodeRadius]);

  return (
    <svg
      width={sugiyamaWidthAspectRatio * scaleMultiplier}
      height={sugiyamaHeightAspectRatio * scaleMultiplier}
      style={{ marginRight: 20 }}
    >
      <g>
        {dag.links().map((link: any) => {
          const { points /*, source, target*/ } = link;
          const pathString = createLine(points as any);
          if (pathString !== null) {
            return <path key={pathString} d={pathString} strokeWidth="3" stroke="rgb(230,230,230)" fill="none" />;
          } else {
            return null;
          }
        })}
      </g>
      <g>
        {dag.descendants().map((d: any) => {
          const vertex: any = ontology.get(d.data.id);
          return (
            <g key={d.data.id} transform={`translate(${d.x * scaleMultiplier},${d.y * scaleMultiplier})`}>
              <circle
                r={vertex.n_cells === 0 ? deemphasizeNodeSize : nCellsScale(vertex.n_cells)}
                fill="rgb(220,220,220)"
              ></circle>
              <text x="-30" y={-20}>
                {vertex.label.substring(0, 10)}
                {vertex.label.length > 10 ? "..." : null}
                <title>{vertex.label}</title>
              </text>
              {vertex.n_cells > 0 && (
                <text fontFamily="monospace" fontSize={10} x={0} y={4} textAnchor="middle">
                  {vertex.n_cells}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
