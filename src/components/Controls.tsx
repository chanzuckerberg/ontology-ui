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

import { useParams } from "react-router-dom";

import { OntologyTerm } from "../types/d";
import { Link } from "react-router-dom";
import {
  settingsDrawerActiveState,
  activeGraphState,
  sugiyamaIsOpenState,
  tutorialDrawerActiveState,
} from "../recoil/controls";
import { useRecoilState, useRecoilValue } from "recoil";
import { sugiyamaIsEnabledState } from "../recoil/sugi";
import { dotplotEnabledState, dotplotIsOpenState } from "../recoil/dotplot";
import { dataTableIsOpenState } from "../recoil/datatable";

interface OntologyExplorerControlDrawerProps {
  pinnedVertex: OntologyTerm | undefined;
  simulationRunning: boolean;
  menubarHeight: number;
  outdegreeCutoffNodes: number;
  deselectPinnedNode: any;
  handleHullChange: any;
  hullsEnabled: boolean;
  highlightAncestors: boolean;
  handleHighlightAncestorChange: any;
  handleDisplayHulls: any;
  minimumOutdegree: string;
  maximumOutdegree: string;
  handleMinOutdegreeChange: any;
  handlePruningDepthChange: any;
  minDepth: number;
  maxDepth: number;
  currentPruningDepth: number;
}

export default function OntologyExplorerControlDrawer(props: OntologyExplorerControlDrawerProps): JSX.Element {
  const [, setActiveGraph] = useRecoilState(activeGraphState);
  const [dotplotIsOpen, setDotplotIsOpen] = useRecoilState(dotplotIsOpenState);
  const [settingsDrawerActive, setSettingsDrawerActive] = useRecoilState(settingsDrawerActiveState);
  const sugiyamaIsEnabled = useRecoilValue(sugiyamaIsEnabledState);
  const [sugiyamaIsOpen, setSugiyamaIsOpen] = useRecoilState(sugiyamaIsOpenState);
  const [tutorialDrawerActive, setTutorialDrawerActive] = useRecoilState(tutorialDrawerActiveState);
  const dotplotEnabled = useRecoilValue(dotplotEnabledState);
  const [dataTableIsOpen, setDataTableIsOpen] = useRecoilState(dataTableIsOpenState);

  const params = useParams();

  const {
    pinnedVertex,
    menubarHeight,
    deselectPinnedNode,
    hullsEnabled,
    handleHullChange,
    highlightAncestors,
    handleHighlightAncestorChange,
    minimumOutdegree,
    maximumOutdegree,
    handleMinOutdegreeChange,
    handlePruningDepthChange,
    minDepth,
    maxDepth,
    currentPruningDepth,
    handleDisplayHulls,
  } = props;

  return (
    <div
      id="menubar"
      style={{
        height: menubarHeight,
        width: "100%",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingLeft: 10,
        paddingRight: 10,
      }}
    >
      <p
        style={{
          fontSize: 16,
          fontWeight: 900,
          position: "relative",
          top: 5,
          marginRight: 20,
        }}
      >
        CELLxGENE
        <span style={{ position: "absolute", left: 0, top: 17, fontSize: 12, color: "#4aa9e7" }}>ONTOLOGY</span>
        {params.ontoID && `: ${params.ontoID}`}
      </p>
      {params.ontoID === "CL" && <Link to={"/a/ontology/UBERON"}> Switch to UBERON</Link>}
      {params.ontoID === "UBERON" && <Link to={"/a/ontology/CL"}> Switch to CL</Link>}
      <Button
        style={{ marginRight: 20, marginLeft: 20 }}
        icon="help"
        onClick={() => {
          setTutorialDrawerActive(true);
        }}
      >
        Welcome & Quickstart
      </Button>
      <Button
        icon="layout-hierarchy"
        onClick={() => {
          setSugiyamaIsOpen(!sugiyamaIsOpen);
        }}
        style={{ marginRight: 20 }}
        disabled={!sugiyamaIsEnabled}
      >
        Hierarchy
      </Button>
      <Button
        icon="heat-grid"
        onClick={() => {
          setDotplotIsOpen(!dotplotIsOpen);
        }}
        style={{ marginRight: 20 }}
        disabled={!dotplotEnabled}
      >
        Dotplot
      </Button>
      <Button
        icon="th"
        onClick={() => {
          setDataTableIsOpen(!dataTableIsOpen);
        }}
        style={{ marginRight: 20 }}
        disabled={!dotplotEnabled}
      >
        Data Table
      </Button>

      <HotkeysTarget2
        hotkeys={[
          {
            combo: "ESC",
            global: true,
            label: "Deselect pinned node",
            onKeyDown: () => {
              deselectPinnedNode();
            },
          },
          {
            combo: "A",
            global: true,
            label: "Highlight node ancestors",
            onKeyDown: () => {
              handleHighlightAncestorChange();
            },
          },
          {
            combo: "T",
            global: true,
            label: "Activate hierarchy / tree / sugiyama layout",
            onKeyDown: () => {
              setSugiyamaIsOpen(!sugiyamaIsOpen);
            },
          },
          {
            combo: "H",
            global: true,
            label: "Display hulls",
            onKeyDown: () => {
              handleDisplayHulls();
            },
          },
          {
            combo: "D",
            global: true,
            label: "Activate dotplot",
            onKeyDown: () => {
              setDotplotIsOpen(!dotplotIsOpen);
            },
          },
          {
            combo: "S",
            global: true,
            label: "Activate settings",
            onKeyDown: () => {
              setSettingsDrawerActive(!settingsDrawerActive);
            },
          },
          {
            combo: "U",
            global: true,
            label: "Activate umap layout",
            onKeyDown: () => {
              setActiveGraph("umap");
            },
          },
          {
            combo: "F",
            global: true,
            label: "Activate force-directed layout",
            onKeyDown: () => {
              setActiveGraph("force");
            },
          },
          {
            combo: "X",
            global: true,
            label: "Activate data table view",
            onKeyDown: () => {
              setDataTableIsOpen(!dataTableIsOpen);
            },
          },
        ]}
      >
        {({ handleKeyDown, handleKeyUp }) => (
          <Button
            icon="unpin"
            tabIndex={0}
            onClick={deselectPinnedNode}
            style={{ marginRight: 20 }}
            disabled={!pinnedVertex}
          >
            Deselect <Tag minimal>Esc</Tag>
          </Button>
        )}
      </HotkeysTarget2>
      <Button
        style={{ marginRight: 20 }}
        icon="settings"
        onClick={() => {
          setSettingsDrawerActive(true);
        }}
      >
        Settings
      </Button>
      <Drawer
        isOpen={settingsDrawerActive}
        size={560}
        onClose={() => {
          setSettingsDrawerActive(false);
        }}
        hasBackdrop={false}
        canOutsideClickClose={true}
        title="Graph configuration"
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            <p>
              Customizations to interface and interactivity. Many affordances have hotkeys — press "shift" and "?" to
              see all of them.
            </p>
            <h2> Interactivity </h2>
            <p>
              Change the behavior of interactions with the graph, such as hovering and hiding parts of the interface
            </p>

            <Checkbox
              checked={highlightAncestors}
              label={"Highlight ancestors of hovered cell (hotkey a)"}
              onChange={handleHighlightAncestorChange}
            />

            <Checkbox checked={true} label="Show cell type force graph" onChange={() => {}} disabled />
            <Checkbox checked={true} label="Show sugiyama directed cyclic graph" onChange={() => {}} disabled />
            <h2> Interpretive overlays </h2>
            <p>Show specific data on top of the graph to accomplish certain tasks</p>
            {/* <h4>Hulls</h4> */}
            <Checkbox checked={hullsEnabled} label="Show cell type hulls (h)" onChange={handleHullChange} />
            <Checkbox checked={false} label="Show cross-reference hulls (u)" onChange={() => {}} disabled />
            <h2> Cell type filtering &amp; subsetting </h2>
            <p>You can subset to a contiguous sugraph by clicking any node and clicking subset. Click any cell type</p>
            <h4>Organism</h4>
            <Checkbox checked={true} label="Remove mouse cell types" onChange={() => {}} disabled />
            <Checkbox checked={true} label="Remove fungal cell types" onChange={() => {}} disabled />
            <h4>Minimum outdegree / prune edges</h4>
            <RadioGroup
              label="Hide cell types with less than N descendants. Set to 1 to remove all terminal nodes in the tree. Set to 250 to remove all the small stuff, to get a good look at the root of the tree."
              onChange={(e) => {
                handleMinOutdegreeChange(e);
              }}
              selectedValue={minimumOutdegree}
            >
              <Radio label="0" value={"0"} />
              <Radio label="1" value={"1"} />
              <Radio label="3" value={"3"} />
              <Radio label="5" value={"5"} />
              <Radio label="10" value={"10"} />
              <Radio label="50" value={"50"} />
              <Radio label="250" value={"250"} />
            </RadioGroup>
            <Checkbox checked={false} label="Show aggregator nodes for min" onChange={() => {}} disabled />
            <h4>Maximum outdegree / prune from root</h4>
            <RadioGroup
              label="Hide cell types with more than N descendants. Set to 250 to remove highly connected cell types like 'electrically active cell' which has over 450 descendants. Set to 10 for lots of little disjoint graphs. 50 is a happy medium."
              onChange={() => {}}
              selectedValue={maximumOutdegree}
              disabled
            >
              <Radio label="10" value={"10"} />
              <Radio label="50" value={"50"} />
              <Radio label="100" value={"100"} />
              <Radio label="250" value={"250"} />
              <Radio label="1000" value={"1000"} />
              <Radio label="off" value={"12345"} />
            </RadioGroup>
            <Checkbox checked={false} label="Show aggregator nodes for max" onChange={() => {}} disabled />
            <h4>Depth pruning</h4>
            <p>
              Hide cell types with depth greater than N. Node depths are their shortest path distance from the root node
              in the ontology. For instance, neuron (CL:0000540) has an absolute node depth of 5. This control is
              limited to the absolute available range of depths for the current subset.
            </p>

            <NumericInput
              min={Math.max(minDepth, 1)}
              max={maxDepth}
              stepSize={1}
              placeholder={currentPruningDepth + ""}
              value={currentPruningDepth}
              onValueChange={(value) => handlePruningDepthChange(value)}
            />
            <h2>Force layout</h2>
            <RadioGroup label="" onChange={() => {}} selectedValue={"tree"} disabled>
              <Radio label="Radial" value="radial" />
              <Radio label="Tree" value="tree" />
            </RadioGroup>
            <h2>Colors</h2>
          </div>
        </div>
        <div className={Classes.DRAWER_FOOTER}>A lovely footer</div>
      </Drawer>
    </div>
  );
}
