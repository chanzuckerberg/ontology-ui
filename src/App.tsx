import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";

import VertexView from "./routes/VertexView";
import DagView from "./routes/DagExplorerView";
import loadDatasetGraph from "./util/loadDatasetGraph";
import { DatasetGraph, Ontology } from "./d";

interface AppState {
  graph?: DatasetGraph;
  lattice?: Ontology;
}

function App() {
  const [state, setState] = useState<AppState>({});
  const { graph, lattice } = state;

  useEffect(() => {
    const initState = async () => {
      const [graph, lattice] = await loadDatasetGraph("/dataset_graph.json");
      setState({ graph, lattice });
    };
    initState();
  }, [setState]);

  return (
    <Router>
      <div
        id="container"
        style={{
          fontFamily: "Helvetica, Arial, sans-serif",
          lineHeight: 1.5,
          color: "#555",
        }}
      >
        <LoadingIndicator loading={!graph} />
        <Helmet>
          <meta charSet="utf-8" />
          <title>Cell Ontology</title>
        </Helmet>

        {graph && lattice && (
          <Routes>
            <Route path="/">
              <Route index element={<Navigate to="cell/ontology" replace />} />

              <Route path="cell">
                <Route index element={<Navigate to="ontology" replace />} />
                <Route path="ontology" element={<DagView ontologyPrefix="CL" lattice={lattice} graph={graph} />} />
                <Route path=":vertexID" element={<VertexView ontology={graph.ontologies.CL} lattice={lattice} />} />
              </Route>

              <Route path="disease">
                <Route index element={<Navigate to="dag" replace />} />
                <Route path="dag" element={<DagView ontologyPrefix="MONDO" lattice={lattice} graph={graph} />} />
                <Route path=":vertexID" element={<VertexView ontology={graph.ontologies.MONDO} lattice={lattice} />} />
              </Route>

              <Route path="compartment">
                <Route index element={<Navigate to="ontology" replace />} />

                <Route path="ontology" element={<DagView ontologyPrefix="UBERON" lattice={lattice} graph={graph} />} />
                <Route path=":vertexID" element={<VertexView ontology={graph.ontologies.UBERON} lattice={lattice} />} />
              </Route>
            </Route>
            <Route path="*" element={<NoMatch />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

interface LoadingIndicatorProps {
  loading?: boolean; // optional, defaults to True
}

function LoadingIndicator({ loading = true }: LoadingIndicatorProps) {
  if (loading) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }
  return null;
}

function NoMatch() {
  const location = useLocation();
  console.log("Oops, unexpected route, redirecting:", location);
  return (
    <main style={{ padding: "1rem" }}>
      <Navigate to="/" />
      <LoadingIndicator />
    </main>
  );
}

export default App;
