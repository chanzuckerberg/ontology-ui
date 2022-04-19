import { OntologyPrefix, Ontology, DatasetGraph } from "../d";
import OntologyExplorer from "../components/OntologyExplorer";

export interface DagExplorerViewProps {
  ontologyPrefix: OntologyPrefix;
  lattice: Ontology;
  graph: DatasetGraph;
}

export default function DagExplorerView({ ontologyPrefix, lattice, graph }: DagExplorerViewProps) {
  const ontology = graph.ontologies[ontologyPrefix];
  const uberon = graph.ontologies.UBERON;

  return <OntologyExplorer ontology={ontology} lattice={lattice} uberon={uberon} />;
}
