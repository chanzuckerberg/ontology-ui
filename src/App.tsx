import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

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
              <Route index element={<Navigate to="ontology/CL" replace />} />
              <Route path="ontology">
                <Route path=":ontoID">
                  <Route index element={<DagView graph={graph} />} />
                  <Route path=":vertexID" element={<DagView graph={graph} />} />
                </Route>
              </Route>
              <Route path="term">
                <Route path=":vertexID" element={<VertexView graph={graph} />} />
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
