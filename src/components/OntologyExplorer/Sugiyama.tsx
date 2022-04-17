import { useState, useEffect } from "react";
import { sugiyama, Dag, dagStratify } from "d3-dag/dist";
import { line, curveCatmullRom } from "d3-shape";

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
  scaleMultiplier: 150,
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

  return (
    <svg
      width={sugiyamaWidthAspectRatio * scaleMultiplier}
      height={sugiyamaHeightAspectRatio * scaleMultiplier}
      style={{ marginRight: 20 }}
    >
      <g>
        {dag.links().map((link: any) => {
          const { points, source, target } = link;
          const pathString = createLine(points as any);
          let xyz = false;

          /**
           * x --> y --> z, remove links from x to z
           *
           */
          const parentVertex: any = ontology.get(source.data.id);
          parentVertex.descendants.forEach((descendantID: string) => {
            const descendantVertex: any = ontology.get(descendantID);

            // check if these descendants have in their own descendants any of the members of parentVertex.descendants
            // if the descendants of the descendant include the target
            // that is, if y includes z, remove it
            if (descendantVertex.descendants.includes(target.data.id)) {
              xyz = true;
            }
          });

          if (pathString !== null && !xyz) {
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
              <circle r={nodeRadius} fill="rgb(200,200,200)"></circle>
              <text x="-30" y={-20}>
                {vertex.label.substring(0, 15)}
                {vertex.label.length > 16 ? "..." : null}
                <title>{vertex.label}</title>
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
