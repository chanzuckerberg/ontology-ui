import { DatasetGraph } from "../../types/d";
import OntologyExplorer from "../LayoutContainer";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "../../util/errorFallback";
import { Suspense } from "react";

export interface DagExplorerViewProps {
  graph: DatasetGraph;
}

export default function DagExplorerView({ graph }: DagExplorerViewProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<p>Loading Ontology Explorer...</p>}>
        <OntologyExplorer graph={graph} />{" "}
      </Suspense>
    </ErrorBoundary>
  );
}
