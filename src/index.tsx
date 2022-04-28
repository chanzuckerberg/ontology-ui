import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { HotkeysProvider } from "@blueprintjs/core";

ReactDOM.render(
  <React.StrictMode>
    <HotkeysProvider>
      <App />
    </HotkeysProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
