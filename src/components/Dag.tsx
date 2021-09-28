import React, { createRef } from "react";

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3-force";

/* 
  we use vertex in this codebase and d3-force uses nodes, 
  a part of the initial motivation of saying vertex is that
  it isn't as general as node, so, perhaps it's ok if it's
  scoped to a component's internal namespace

  we have to extend SimuluationNodeDatum, so we can do this explicitly...

  types: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/d3-force/index.d.ts
*/

interface IProps {
  ontologyName: string;
  ontology: Map<string, unknown | object>;
}

interface OntologyVertexDatum extends SimulationNodeDatum {
  id: "string";
}

interface IState {
  nodes: OntologyVertexDatum[] | null;
  links: SimulationLinkDatum<any>[] | null;
  width: number;
  height: number;
}

class DAG extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      width: 2000,
      height: 2000,
    };
  }

  private dagCanvasRef = createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { ontology } = this.props;

    /* todo typescript, it doesn't like that these are empty at first? */
    const nodes: any = [];
    const links: any = [];

    ontology.forEach((vertex: any, vertexID: string) => {
      nodes.push({ id: vertexID });

      vertex.descendants.forEach((descendent: string) => {
        links.push({
          source: vertexID,
          target: descendent,
        });
      });
    });

    this.setState({ nodes, links });
  }

  drawForce = (
    nodes: OntologyVertexDatum[],
    links: SimulationLinkDatum<any>[],
    width: number,
    height: number
  ) => {
    /* via fil's observable https://observablehq.com/@d3/force-directed-graph-canvas */

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink(links).id((d: any) => d.id)
      )
      .force("charge", forceManyBody())
      .force("center", forceCenter(width / 2, height / 2));

    const context = this.dagCanvasRef.current!.getContext("2d"); //.context2d(width, height);

    simulation.on("tick", ticked);

    /* wth, observable https://observablehq.com/@observablehq/stdlib#invalidationSection */
    // invalidation.then(() => simulation.stop());

    // return d3.select(context.canvas).call(drag(simulation)).node();

    function ticked() {
      if (context) {
        context.clearRect(0, 0, width, height);

        context.beginPath();
        links.forEach(drawLink);
        context.strokeStyle = "#aaa";
        context.stroke();

        context.strokeStyle = "#fff";
        for (const node of nodes) {
          context.beginPath();
          drawNode(node);
          context.fillStyle = "#000"; //color(node);
          context.fill();
          context.stroke();
        }
      }
    }

    const drawLink = (d: SimulationLinkDatum<any>) => {
      if (context) {
        context.moveTo(d.source.x, d.source.y);
        context.lineTo(d.target.x, d.target.y);
      }
      return null;
    };

    const drawNode = (d: OntologyVertexDatum) => {
      /* refactor this if statement away */
      if (context && d && typeof d.x === "number" && typeof d.y === "number") {
        context.moveTo(d.x + 3, d.y);
        context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
      } else {
        console.log(
          "Tried to draw a node, but d.x was not a number, see Dag.tsx drawForce() drawNode"
        );
      }
    };

    return null;
  };

  render() {
    const { nodes, links, width, height } = this.state;

    return (
      <div>
        {nodes && links && this.drawForce(nodes, links, width, height)}
        <canvas
          style={{ position: "absolute", top: 0, left: 0 }}
          width={width}
          height={height}
          ref={this.dagCanvasRef}
        />
      </div>
    );
  }
}

export default DAG;
