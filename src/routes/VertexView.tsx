import { useParams } from "react-router-dom";

import { DatasetGraph, OntologyId } from "../d";
import Vertex from "../components/Vertex";

export interface VertexViewProps {
  graph: DatasetGraph;
}

export default function VertexView({ graph }: VertexViewProps) {
  const { vertexID } = useParams();
  const ontoID = vertexID?.split(":", 1)[0];
  const ontology = ontoID ? graph?.ontologies[ontoID] : undefined;
  const vertex = vertexID ? ontology?.get(vertexID) : undefined;
  if (!vertex) return null;

  return null /* <Vertex graph={graph} vertex={vertex} makeTo={(id: OntologyId) => `../${id}`} /> */;
}
