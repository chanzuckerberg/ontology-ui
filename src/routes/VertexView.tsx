import { useParams } from "react-router-dom";

import { OntologyPrefix, Ontology } from "../d";
import Vertex from "../components/Vertex";

export interface VertexViewProps {
  ontologyPrefix: OntologyPrefix;
  ontology: Ontology;
  lattice: Ontology;
}

export default function VertexView({ ontologyPrefix, ontology, lattice }: VertexViewProps) {
  const { vertexID } = useParams();
  const vertex = vertexID ? ontology.get(vertexID) : undefined;

  if (!vertexID || !vertex) return null;

  return (
    <Vertex ontologyPrefix={ontologyPrefix} ontology={ontology} vertex={vertex} vertexID={vertexID} lattice={lattice} />
  );
}
