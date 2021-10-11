import React, { createRef } from "react";

import {
  dagConnect,
  sugiyama,
  layeringSimplex,
  layeringLongestPath,
  layeringCoffmanGraham,
  decrossOpt,
  twolayerOpt,
  decrossTwoLayer,
  coordQuad,
  coordGreedy,
  coordCenter,
  Dag,
  dagStratify,
} from "d3-dag/dist";

import { symbolTriangle, symbol, line, curveCatmullRom } from "d3-shape";
import { interpolateRainbow } from "d3-scale-chromatic";

import { IOntology, IVertex } from "../../d";

interface IProps {
  sugiyamaStratifyData: any;
  ontology: IOntology;
}

interface IState {
  nodeRadius: number;
  layeringChoice: string;
  decrossingsChoice: string;
  coordsChoice: string;
}

class Sugiyama extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodeRadius: 10,
      layeringChoice: "Simplex (slow)",
      decrossingsChoice: "Optimal (slow)",
      coordsChoice: "Quad (slow)",
    };
  }

  render() {
    const { nodeRadius } = this.state;
    const { sugiyamaStratifyData, ontology } = this.props;

    /**
     * d3-dag options
     */
    const layerings = {
      "Simplex (slow)": layeringSimplex(),
      "Longest Path (fast)": layeringLongestPath(),
      "Coffman Graham (medium)": layeringCoffmanGraham(),
    };

    const decrossings = {
      "Optimal (slow)": decrossOpt(),
      "Two Layer Opt (medium)": decrossTwoLayer().order(twolayerOpt()),
      "Two Layer (fast)": decrossTwoLayer(),
    };

    const coords = {
      "Quad (slow)": coordQuad(),
      "Greedy (medium)": coordGreedy(),
      "Center (fast)": coordCenter(),
    };

    /**
     * Initialize d3-dag layout operator
     */
    const _sugiyamaLayout = sugiyama();
    // .layering(layerings["Simplex (slow)"])
    // .decross(decrossings["Two Layer (fast)"])
    // .coord(coords["Quad (slow)"])
    // .nodeSize(() => [nodeRadius * 2 * 1.5, nodeRadius * 2 * 1.5]);

    /**
     * Initialize stratify data operator
     * https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.ConnectOperator.html
     */
    const _createDagStructure = dagStratify();

    /**
     * transform data to d3-dag preferred format
     */
    const dag: Dag = _createDagStructure(sugiyamaStratifyData);

    /**
     * pass the data structure to the layout generator
     */
    const layout = _sugiyamaLayout(dag); // error is here

    const { width, height } = layout;

    /**
     * scale multiplier, sugiyama returns small numbers it seems, between 0 and 10
     */
    const s = 100;

    const createLine = line()
      .curve(curveCatmullRom)
      .x((d: any) => d.x * s)
      .y((d: any) => d.y * s);

    return (
      <svg
        width={width * s}
        height={height * s}
        style={{
          position: "absolute",
          top: 1500,
          left: 40,
          border: "1px solid pink",
        }}
      >
        <g>
          {dag.links().map((link) => {
            const { points } = link;
            const pathString = createLine(points as any);
            if (pathString !== null) {
              return (
                <path
                  d={pathString}
                  strokeWidth="3"
                  stroke="rgb(230,230,230)"
                  fill="none"
                />
              );
            } else {
              return null;
            }
          })}
        </g>
        <g>
          {dag.descendants().map((d: any) => {
            const vertex: any = ontology.get(d.data.id);
            return (
              <g key={d.data.id} transform={`translate(${d.x * s},${d.y * s})`}>
                <circle r={nodeRadius} fill="rgb(200,200,200)"></circle>
                <text x="-30" y="-20">
                  {vertex.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  }
}

export default Sugiyama;
