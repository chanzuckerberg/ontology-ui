import { line, curveCatmullRom } from "d3-shape";

import { scaleLinear } from "d3-scale";

import { Ontology } from "../../d";
import { useRecoilValue } from "recoil";
import { dagState, layoutState } from "../../recoil/sugi";

interface SugiyamaProps {
  ontology: Ontology;
}

export default function Sugiyama({ ontology }: SugiyamaProps): JSX.Element | null {
  /* recoil */
  /* selectors */
  const layout = useRecoilValue(layoutState);
  const dag = useRecoilValue(dagState);

  const { sugiyamaWidthAspectRatio, sugiyamaHeightAspectRatio, scaleMultiplier } = layout;
  if (!dag || !sugiyamaWidthAspectRatio || !sugiyamaHeightAspectRatio) return null;

  const createLine = line()
    .curve(curveCatmullRom)
    .x((d: any) => d.x * scaleMultiplier)
    .y((d: any) => d.y * scaleMultiplier + Math.random());

  /**
   * Sizes
   */
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
