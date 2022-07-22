import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import VertexView from "./routes/VertexView";
import DagView from "./routes/DagExplorerView";
import loadDatasetGraph from "./util/loadDatasetGraph";
import { DatasetGraph, Ontology } from "./d";

import { useRecoilState } from "recoil";
import { selectedGeneState, selectedGeneExpressionDataState } from "./recoil";
import apod from "./recoil/apod";

interface AppState {
  graph?: DatasetGraph;
  lattice?: Ontology;
}

function App({ basename }: { basename: string }) {
  const [state, setState] = useState<AppState>({});
  // const [ensemble, setEnsemble] = useState(null);
  const { graph, lattice } = state;

  const [selectedGene] = useRecoilState(selectedGeneState);
  const [selectedGeneExpressionData, setSelectedGeneExpressionData] = useRecoilState(selectedGeneExpressionDataState);

  useEffect(() => {
    const initState = async () => {
      const [graph, lattice] = await loadDatasetGraph("./dataset_graph.json");
      setState({ graph, lattice });
    };
    initState();
  }, [setState]);

  // useEffect(() => {
  //   const getEnsemble = async () => {
  //     const response = await
  //   };

  // }, [setState]); // we only need to load this once... same as dataset graph, so copying above pattern perhaps is the correct path?

  useEffect(() => {
    const getGene = async () => {
      console.log("trying to get gene from api...");

      const url1 = "https://api.cellxgene.cziscience.com/wmg/v1/query"; // cors and other errors
      const url2 = "https://api.cellxgene.staging.single-cell.czi.technology/wmg/v1/query";

      const response = await fetch(url2, {
        method: "POST",
        body: JSON.stringify(apod),
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
        },
      });

      const content = await response.json();
      setSelectedGeneExpressionData(content);
    };

    getGene().catch((err) => {
      throw new Error(err.message);
    });
  }, [selectedGene, setSelectedGeneExpressionData]);

  console.log("selectedGeneExpressionData recoil: ", selectedGeneExpressionData);

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
