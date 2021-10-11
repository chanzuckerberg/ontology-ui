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
interface IProps {
  sugiyamaStratifyData: any;
}

interface IState {
  width: number;
  height: number;
  nodeRadius: number;
  layeringChoice: string;
  decrossingsChoice: string;
  coordsChoice: string;
}

class Sugiyama extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      width: 100,
      height: 100,
      nodeRadius: 3,
      layeringChoice: "Simplex (slow)",
      decrossingsChoice: "Optimal (slow)",
      coordsChoice: "Quad (slow)",
    };
  }

  render() {
    const { nodeRadius } = this.state;
    const { sugiyamaStratifyData } = this.props;

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

    const _sugiyamaLayout = sugiyama()
      .layering(layerings["Simplex (slow)"])
      .decross(decrossings["Two Layer (fast)"])
      .coord(coords["Quad (slow)"])
      .nodeSize(() => [nodeRadius * 2 * 1.5, nodeRadius * 2 * 1.5]);

    /**
     * set up the generator that takes data and returns structure
     * https://erikbrinkman.github.io/d3-dag/interfaces/dag_create.ConnectOperator.html
     */
    const _createDag = dagStratify();

    console.log("dag", sugiyamaStratifyData);

    /**
     * get the data structure
     * pass in [['src', 'trgt'], ['b cell', 'type of b cell']] format
     * we get back the data format we need
     */
    const stratified: Dag = _createDag(sugiyamaStratifyData);

    console.log("stratified", stratified);

    /**
     * pass the data structure to the layout generator
     */
    const dag = _sugiyamaLayout(stratified as any); // error is here

    console.log("layout", dag);

    const { width, height } = dag;

    const createLine = line()
      .curve(curveCatmullRom)
      .x((d: any) => d.x)
      .y((d: any) => d.y);

    return (
      <svg width={width} height={height} style={{ border: "1px solid pink" }}>
        {
          //        const nodes = svgSelection.append('g')
          //     .selectAll('g')
          //     .data(dag.descendants())
          //     .enter()
          //     .append('g')
          //     .attr('transform', ({x, y}) => `translate(${x}, ${y})`);
          // nodes.append('circle')
          // .attr('r', nodeRadius)
          // .attr('fill', n => colorMap[n.id]);
          // // Add text to nodes
          // nodes.append('text')
          // .text(d => d.id)
          // .attr('font-weight', 'bold')
          // .attr('font-family', 'sans-serif')
          // .attr('text-anchor', 'middle')
          // .attr('alignment-baseline', 'middle')
          // .attr('fill', 'white');
        }

        {
          // svgSelection
          //   .append("g")
          //   .selectAll("path")
          //   .data(dag.links())
          //   .enter()
          //   .append("path")
          //   .attr("d", ({ points }) => line(points))
          //   .attr("fill", "none")
          //   .attr("stroke-width", 3)
        }
      </svg>
    );
  }
}

export default Sugiyama;
