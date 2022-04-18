import { useParams } from "react-router-dom";

import { Ontology } from "../d";
import Vertex from "../components/Vertex";

export interface VertexViewProps {
  ontology: Ontology;
  lattice: Ontology;
}

export default function VertexView({ ontology, lattice }: VertexViewProps) {
  const { vertexID } = useParams();
  const vertex = vertexID ? ontology.get(vertexID) : undefined;

  if (!vertexID || !vertex) return null;

  return <Vertex ontology={ontology} vertex={vertex} vertexID={vertexID} lattice={lattice} />;
}
