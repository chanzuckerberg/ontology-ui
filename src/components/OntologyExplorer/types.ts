/*
 * Shard types for the ontology explorer component tree
 */

import { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";

import { Ontology } from "../../d";

export interface OntologyVertexDatum extends SimulationNodeDatum {
  id: string;
  hasAncestors: boolean;
  hasDescendants: boolean;
  n_cells?: number;
}

export interface NamedOntology {
  ontology: Ontology;
  name: string;
}

export interface OntologyExplorerProps {
  ontology: Ontology;
  lattice: Ontology;
  xref: NamedOntology;
}

// state related to creating the DAG
export interface CreateDagProps {
  minimumOutdegree: number /* max descendants */;
  maximumOutdegree: number;
  outdegreeCutoffXYZ: number /* max descendants */;
  doCreateSugiyamaDatastructure: boolean;
}

// state related to the current DAG
export interface DagState {
  nodes: OntologyVertexDatum[];
  links: SimulationLinkDatum<any>[];
  sugiyamaStratifyData: any;
}

// state related to the creation of the force-graph
export interface ForceCanvasProps {
  forceCanvasWidth: number;
  forceCanvasHeight: number;
  scaleFactor: number;
  translateCenter: number;
}

// Other DAG exploration state
export interface OntologyExplorerState {
  dagCreateProps: CreateDagProps;
  sugiyamaRenderThreshold: number;
  cardWidth: number;
  cardHeight: number;
  menubarHeight: number;
}
