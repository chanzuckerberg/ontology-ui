import React from "react";
import ReactDOM from "react-dom";
import { HelmetProvider } from "react-helmet-async";
import { RecoilRoot } from "recoil";
import { RecoilURLSync } from "recoil-sync";
import "recoil-sync/";

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
        <RecoilRoot>
          <RecoilURLSync serialize={(x: any) => x} deserialize={(x: any) => x} location={{ part: "queryParams" }}>
            <App basename={basename} />
          </RecoilURLSync>
        </RecoilRoot>
      </HotkeysProvider>
    </HelmetProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
