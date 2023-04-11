import {
  Button,
  Classes,
  Drawer,
  RadioGroup,
  Radio,
  Checkbox,
  NumericInput,
  HotkeysTarget2,
  Tag,
} from "@blueprintjs/core";
import { useRecoilState } from "recoil";
import { tutorialDrawerActiveState } from "../recoil/controls";

import onto_tut_1 from "/public/images/onto_tut_1.mp4";
import onto_tut_2 from "/public/images/onto_tut_2.mp4";
import onto_tut_3 from "/public/images/onto_tut_3.mp4";

const Tutorial = () => {
  const [tutorialDrawerActive, setTutorialDrawerActive] = useRecoilState(tutorialDrawerActiveState);

  const tutorialSidebarWidth = 560;
  const imageMargin = 20;
  const imageWidth = tutorialSidebarWidth - imageMargin * 2;

  return (
    <div>
      <Drawer
        isOpen={tutorialDrawerActive}
        size={tutorialSidebarWidth}
        onClose={() => {
          setTutorialDrawerActive(false);
        }}
        hasBackdrop={false}
        canOutsideClickClose={true}
        title="CELLxGENE Ontology Quickstart"
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            <h2> Welcome & Quickstart (~2 min) </h2>
            <p>
              Welcome to the CELLxGENE Ontology quickstart tutorial! This tool is designed to help you explore tens of
              millions of cells in the CELLxGENE portal, which aggregates single-cell RNA sequencing (scRNAseq) data. In
              this ~2 minute guide, we'll walk you through the main features and how to navigate the user interface.
            </p>
            <p>
              <a href="https://github.com/chanzuckerberg/ontology-ui/issues/new" target="blank">
                Stuck? Feature request? Submit an issue on GitHub!
              </a>
            </p>

            <h2>1. Hover, click, search, highlight</h2>

            <p>
              Upon launching the CELLxGENE Ontology tool, you will see the interface displaying the entire CL ontology
              directed acyclic graph using a force layout. Press the <strong>H</strong> key to toggle the visibility of
              hulls, which outline subtrees.
            </p>
            <p>
              Swap compartment for "cell type" and search for a T Cell, which will match on substring. On click
              selection, a selected node will turn black, and the left sidebar will display information about the
              selected cell.
            </p>
            <video width={imageWidth} autoPlay loop muted playsInline>
              <source src={onto_tut_1} type="video/mp4" />
            </video>
            <h2>2. Subset, explore T Cells, color by marker genes</h2>
            <p>
              Use the magnifying glass to "move" the T Cell cell type CL:0000084 to the right sidebar. Filter using
              "keep nodes matching: CL:0000084" to subset using T Cell as the root. Choose a gene to explore, such as
              CCL5. The differential expression data comes from the portal, and you can now see which other T Cells
              express this gene and at what levels across over five million collected T Cells.
            </p>
            <video width={imageWidth} autoPlay loop muted playsInline>
              <source src={onto_tut_2} type="video/mp4" />
            </video>

            <h2>3. Dotplot Visualization</h2>
            <p>
              Press the <strong>D</strong> key to generate a dotplot of the currently selected subtree. This
              visualization will display all differentially expressed genes for all T Cell descendants. Press the{" "}
              <strong>T</strong> key to toggle the hierarchical tree layout.
            </p>
            <video width={imageWidth} autoPlay loop muted playsInline>
              <source src={onto_tut_3} type="video/mp4" />
            </video>
            <h2>4. UMAP Projection</h2>
            <p>
              Return to the force layout and press the <strong>U</strong> key to compute the UMAP projection of the
              selected cell types.
            </p>
            <h2>5. Egress to CELLxGENE Discover</h2>
            <p>
              Note that for each cell type, the left sidebar displays a link to the CELLxGENE Discover tool with
              datasets from that cell type.
            </p>
            <h2>6. Controls and Settings</h2>
            <p>
              Discover various hotkeys and controls by pressing <strong>Shift + ?</strong>. To access the settings
              sidebar, press the <strong>S</strong> key.
            </p>
            <h2>7. Feedback</h2>
            <p>
              We hope this tutorial helps you get started with the CELLxGENE Ontology tool. Enjoy exploring the wealth
              of scRNAseq data and uncovering new insights!
            </p>
            <a href="https://github.com/chanzuckerberg/ontology-ui/issues/new" target="blank">
              Stuck? Feature request? Submit an issue on GitHub!
            </a>
          </div>
        </div>
        <div className={Classes.DRAWER_FOOTER}>
          <a href="https://github.com/chanzuckerberg/ontology-ui/issues/new" target="blank">
            Stuck? Feature request? Submit an issue on GitHub!
          </a>
        </div>
      </Drawer>
    </div>
  );
};

export default Tutorial;
