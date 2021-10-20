import React, { createRef } from "react";
import { forceSimulation, forceCollide } from "d3-force-3d";
import ForceGraph3D from "3d-force-graph";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import SpriteText from "three-spritetext";
import Three from "three";

import { IOntology, IVertex } from "../d";
import { createNodesLinksHulls } from "../util/createNodesLinksHulls";
import Vertex from "./Vertex";

interface IProps {
  ontology: IOntology;
  ontologyName: string;
}
interface IState {
  nodes: any;
  links: any;
  outdegreeCutoff: number;
}

class ThreeOntology extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      nodes: null,
      links: null,
      outdegreeCutoff: 250,
    };
  }
  private threeRef = createRef<HTMLDivElement>();
  componentDidMount() {
    const { ontology } = this.props;
    const { outdegreeCutoff } = this.state;

    /**
     * this could be broken out, as a feature, as:
     * [x] toggle off leaf nodes, descendants === 0
     * [50] choose outdegree limit
     * in which case we would want this to be multiple
     * arrays that we merge, maybe easier to force remount
     * than keep track of render count at that point?
     */
    const filteredNodes: string[] = [];

    /**
     * choose which nodes not to show
     */
    ontology.forEach((v: any, id) => {
      if (
        v.descendants.length > outdegreeCutoff || // more than n descendants
        // v.descendants.length === 0 || // zero descendants
        v.label.includes("Mus musculus") // mouse
        // !v.label.includes("kidney") // limit to b cell subset
      ) {
        filteredNodes.push(id);
      }
    });

    const { nodes, links } = createNodesLinksHulls(
      ontology,
      filteredNodes, // filter
      outdegreeCutoff
    );
    this.setState({ nodes, links });
  }

  renderThree = () => {
    const { ontology } = this.props;
    const { nodes, links } = this.state;
    const ref: any = document.getElementById("threeGraph");
    const nodeAndLinkData = {
      nodes,
      links,
    };

    /**
     * Setup three.js renderer
     */
    const Graph = ForceGraph3D({ controlType: "fly" })(ref)
      .graphData(nodeAndLinkData)
      .linkDirectionalArrowLength(3.5)
      .linkDirectionalArrowRelPos(1);

    Graph.backgroundColor("white");

    /**
     * Store the scene and camera for other consumers
     */
    const scene = Graph.scene();
    const camera = Graph.camera();

    /**
     * Render text on nodes
     */
    Graph.nodeLabel((d: any) => {
      const vertex: any = ontology.get(d.id);
      return vertex.label;
    });

    /**
     * Node color
     */
    Graph.nodeColor((d: any) => {
      console.log(d);
      return d.descendantCount === 0 ? "black" : "red";
    });

    /**
     * Link direction particles
     */
    // Graph.linkDirectionalParticles(2);

    Graph.onNodeClick((node: any) => {
      // Aim at node from outside it
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      Graph.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        3000 // ms transition duration
      );
    });

    /**
     * Postprocessing
     */

    // const bloomPass = new UnrealBloomPass();
    // bloomPass.strength = 3;
    // bloomPass.radius = 1;
    // bloomPass.threshold = 0.1;
    //   .addPass(bloomPass);

    const bokehParams = { focus: 500, aperture: 0.01, maxblur: 0.01 }; // maxBlur .001 to turn back on
    const bokehPass = new BokehPass(scene, camera, bokehParams);
    // Graph.postProcessingComposer().addPass(bokehPass);
  };

  render() {
    const { nodes, links } = this.state;
    return (
      <div ref={this.threeRef} id="threeGraph">
        {nodes && links && this.renderThree()}
      </div>
    );
  }
}

export default ThreeOntology;
