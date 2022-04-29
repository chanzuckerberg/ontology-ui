import { DatasetGraph } from "../d";
import OntologyExplorer from "../components/OntologyExplorer";

export interface DagExplorerViewProps {
  graph: DatasetGraph;
}

export default function DagExplorerView({ graph }: DagExplorerViewProps) {
  return <OntologyExplorer graph={graph} />;
}
