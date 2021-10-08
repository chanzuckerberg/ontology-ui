import React, { createRef } from "react";

import {
  dagStratify,
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
} from "d3-dag/dist";

import { symbolTriangle, symbol, line, curveCatmullRom } from "d3-shape";

import { IOntology } from "../../d";

interface IProps {
  ontology: IOntology;
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
    const { ontology } = this.props;

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

    const layout = sugiyama()
      .layering(layerings["Simplex (slow)"])
      .decross(decrossings["Optimal (slow)"])
      .coord(coords["Quad (slow)"])
      .nodeSize(() => [nodeRadius * 2 * 1.5, nodeRadius * 2 * 1.5]);

    // const dag = layout(pairs);

    return (
      <svg>
        <text>hello world</text>{" "}
      </svg>
    );
  }
}

export default Sugiyama;

/* 





  
  // This code only handles rendering
  const svgNode = svg`<svg width=${width} height=${height}></svg>`
  
  const svgSelection = d3.select(svgNode);
  const defs = svgSelection.append('defs'); // For gradients
  
  const steps = dag.size();
  const interp = d3.interpolateRainbow;
  const colorMap = {};
  for (const [i, node] of dag.idescendants().entries()) {
    colorMap[node.id] = interp(i / steps);
  };
  
  // How to draw edges
  const line = d3.line()
    .curve(d3.curveCatmullRom)
    .x(d => d.x)
    .y(d => d.y);
    
  // Plot edges
  svgSelection.append('g')
    .selectAll('path')
    .data(dag.links())
    .enter()
    .append('path')
    .attr('d', ({ points }) => line(points))
    .attr('fill', 'none')
    .attr('stroke-width', 3)
    .attr('stroke', ({source, target}) => {
      // use encode URI component to handle special characters
      const gradId = encodeURIComponent(`${source.id}--${target.id}`);
      const grad = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', source.x)
        .attr('x2', target.x)
        .attr('y1', source.y)
        .attr('y2', target.y);
      grad.append('stop').attr('offset', '0%').attr('stop-color', colorMap[source.id]);
      grad.append('stop').attr('offset', '100%').attr('stop-color', colorMap[target.id]);
      return `url(#${gradId})`;
    });
  
  // Select nodes
  const nodes = svgSelection.append('g')
    .selectAll('g')
    .data(dag.descendants())
    .enter()
    .append('g')
    .attr('transform', ({x, y}) => `translate(${x}, ${y})`);
  
  // Plot node circles
  nodes.append('circle')
    .attr('r', nodeRadius)
    .attr('fill', n => colorMap[n.id]);
  
  const arrow = d3.symbol().type(d3.symbolTriangle).size(nodeRadius * nodeRadius / 5.0);
  svgSelection.append('g')
    .selectAll('path')
    .data(dag.links())
    .enter()
    .append('path')
    .attr('d', arrow)
    .attr('transform', ({
      source,
      target,
      points
    }) => {
      const [end, start] = points.slice().reverse();
      // This sets the arrows the node radius (20) + a little bit (3) away from the node center, on the last line segment of the edge. This means that edges that only span ine level will work perfectly, but if the edge bends, this will be a little off.
      const dx = start.x - end.x;
      const dy = start.y - end.y;
      const scale = nodeRadius * 1.15 / Math.sqrt(dx * dx + dy * dy);
      // This is the angle of the last line segment
      const angle = Math.atan2(-dy, -dx) * 180 / Math.PI + 90;
      console.log(angle, dx, dy);
      return `translate(${end.x + dx * scale}, ${end.y + dy * scale}) rotate(${angle})`;
    })
    .attr('fill', ({target}) => colorMap[target.id])
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5);

  // Add text to nodes
  nodes.append('text')
    .text(d => d.id)
    .attr('font-weight', 'bold')
    .attr('font-family', 'sans-serif')
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .attr('fill', 'white');
    

    */
