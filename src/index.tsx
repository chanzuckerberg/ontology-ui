import React from "react";
import ReactDOM from "react-dom";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { HotkeysProvider } from "@blueprintjs/core";

ReactDOM.render(
  <React.StrictMode>
    <HelmetProvider>
      <HotkeysProvider>
        <App />
      </HotkeysProvider>
    </HelmetProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
