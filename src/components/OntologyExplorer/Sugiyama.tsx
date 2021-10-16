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
  dag: any;
  scaleMultiplier: number;
  sugiyamaWidthAspectRatio: number | null;
  sugiyamaHeightAspectRatio: number | null;
}

class Sugiyama extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodeRadius: 10,
      layeringChoice: "Simplex (slow)",
      decrossingsChoice: "Optimal (slow)",
      coordsChoice: "Quad (slow)",
      scaleMultiplier: 150,
      dag: null,
      sugiyamaWidthAspectRatio: null,
      sugiyamaHeightAspectRatio: null,
    };
  }
  componentDidMount = () => {
    this.setup();
  };

  setup = () => {
    const { sugiyamaStratifyData } = this.props;
    const { nodeRadius } = this.state;

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

    const arrow = symbol()
      .type(symbolTriangle)
      .size((nodeRadius * nodeRadius) / 5.0);

    this.setState({
      dag,
      sugiyamaWidthAspectRatio: width,
      sugiyamaHeightAspectRatio: height,
    });
  };

  render() {
    const {
      nodeRadius,
      sugiyamaWidthAspectRatio,
      sugiyamaHeightAspectRatio,
      dag,
      scaleMultiplier,
    } = this.state;
    const { sugiyamaStratifyData, ontology } = this.props;

    if (!dag || !sugiyamaWidthAspectRatio || !sugiyamaHeightAspectRatio)
      return null;

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
            if (pathString !== null) {
              return (
                <path
                  key={pathString}
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
              <g
                key={d.data.id}
                transform={`translate(${d.x * scaleMultiplier},${
                  d.y * scaleMultiplier
                })`}
              >
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
}

export default Sugiyama;

// svgSelection
//   .append("g")
//   .selectAll("path")
//   .data(dag.links())
//   .enter()
//   .append("path")
//   .attr("d", arrow)
//   .attr("transform", ({ source, target, points }) => {
//     const [end, start] = points.slice().reverse();
//     // This sets the arrows the node radius (20) + a little bit (3) away from the node center, on the last line segment of the edge. This means that edges that only span ine level will work perfectly, but if the edge bends, this will be a little off.
//     const dx = start.x - end.x;
//     const dy = start.y - end.y;
//     const scale = (nodeRadius * 1.15) / Math.sqrt(dx * dx + dy * dy);
//     // This is the angle of the last line segment
//     const angle = (Math.atan2(-dy, -dx) * 180) / Math.PI + 90;
//     console.log(angle, dx, dy);
//     return `translate(${end.x + dx * scale}, ${
//       end.y + dy * scale
//     }) rotate(${angle})`;
//   })
//   .attr("fill", ({ target }) => colorMap[target.id])
//   .attr("stroke", "white")
//   .attr("stroke-width", 1.5);
