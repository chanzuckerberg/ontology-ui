import React from "react";
import ReactDOM from "react-dom";
import { HelmetProvider } from "react-helmet-async";

import App from "./App";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import { HotkeysProvider } from "@blueprintjs/core";

const baseurl = document.querySelector("base")?.getAttribute("href") ?? "/";
const basename = baseurl?.startsWith("/") ? baseurl : new URL(baseurl).pathname;

ReactDOM.render(
  <React.StrictMode>
    <HelmetProvider>
      <HotkeysProvider>
        <App basename={basename} />
      </HotkeysProvider>
    </HelmetProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
