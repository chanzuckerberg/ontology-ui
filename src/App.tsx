import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import VertexView from "./components/routes/VertexView";
import DagView from "./components/routes/DagExplorerView";
import loadDatasetGraph from "./util/loadDatasetGraph";
import { DatasetGraph, Ontology } from "./types/d";

interface AppState {
  graph?: DatasetGraph;
  lattice?: Ontology;
}

function App({ basename }: { basename: string }) {
  const [state, setState] = useState<AppState>({});
  const { graph, lattice } = state;

  useEffect(() => {
    const initState = async () => {
      const [graph, lattice] = await loadDatasetGraph("./dataset_graph.json");
      setState({ graph, lattice });
    };

    initState();
  }, [setState]);

  // fetch json at port 5000/api
  useEffect(() => {
    const initState = async () => {
      const response = await fetch("/api");
      const data = await response.text();
      console.log(data);
    };

    initState();
  });

  return (
    <Router basename={basename}>
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
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,300;0,400;0,700;1,400&display=swap"
            rel="stylesheet"
          />
        </Helmet>

        {graph && lattice && (
          <Routes>
            <Route path="/">
              <Route index element={<Navigate to="/a/ontology/CL" replace />} />
              <Route path="/a/ontology">
                <Route path=":ontoID">
                  <Route index element={<DagView graph={graph} />} />
                  <Route path=":vertexID" element={<DagView graph={graph} />} />
                </Route>
              </Route>
              <Route path="/a/term">
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
