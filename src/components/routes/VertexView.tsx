import { useParams } from "react-router-dom";

import { DatasetGraph, OntologyId } from "../../types/d";
import Vertex from "../Vertex";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "../../util/errorFallback";

export interface VertexViewProps {
  graph: DatasetGraph;
}

export default function VertexView({ graph }: VertexViewProps) {
  const { vertexID } = useParams();
  const ontoID = vertexID?.split(":", 1)[0];
  const ontology = ontoID ? graph?.ontologies[ontoID] : undefined;
  const vertex = vertexID ? ontology?.get(vertexID) : undefined;
  if (!vertex) return null;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<p>Loading, this is a suspsense fallback ui</p>}>
        <Vertex graph={graph} vertex={vertex} makeTo={(id: OntologyId) => `../${id}`} />{" "}
      </Suspense>
    </ErrorBoundary>
  );
}
