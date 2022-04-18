import { useState, useEffect } from "react";

import { Ontology, OntologyTerm } from "../../d";
import { Button, Classes, Drawer, RadioGroup, Radio, InputGroup, Checkbox, MenuItem } from "@blueprintjs/core";
import { OntologyVertexDatum } from ".";

import { ItemRenderer, ItemPredicate, Omnibar } from "@blueprintjs/select";

interface ICompartmentOmnibarItem {
  uberonID: string;
  label: string;
}

const CompartmentOmnibar = Omnibar.ofType<ICompartmentOmnibarItem>();

interface OntrologyExplorderControlDrawerProps {
  pinnedNode: OntologyVertexDatum | undefined;
  dagSearchText: string;
  simulationRunning: boolean;
  menubarHeight: number;
  isSubset: boolean;
  outdegreeCutoffNodes: number;
  uberon: null | Ontology;
  handleDagSearchChange: any;
  subsetToNode: any;
  resetSubset: any;
  setCompartment: any;
  handleHullChange: any;
  hullsEnabled: boolean;
  highlightAncestors: boolean;
  handleHighlightAncestorChange: any;
  showTabulaSapiensDataset: boolean;
  handleShowTabulaSapiensChange: any;
  minimumOutdegree: string;
  maximumOutdegree: string;
  handleMinOutdegreeChange: any;
}

export default function OntrologyExplorderControlDrawer(props: OntrologyExplorderControlDrawerProps): JSX.Element {
  const [settingsIsOpen, setSettingsIsOpen] = useState<boolean>(false);
  const [compartmentSearchIsOpen, setCompartmentSearchIsOpenState] = useState<boolean>(false);
  const [uberonVerticesAsArray, setUberonVerticesAsArray] = useState<ICompartmentOmnibarItem[]>([]);

  const {
    uberon,
    pinnedNode,
    dagSearchText,
    simulationRunning,
    menubarHeight,
    isSubset,
    handleDagSearchChange,
    subsetToNode,
    resetSubset,
    setCompartment,
    hullsEnabled,
    handleHullChange,
    highlightAncestors,
    handleHighlightAncestorChange,
    showTabulaSapiensDataset,
    handleShowTabulaSapiensChange,
    minimumOutdegree,
    maximumOutdegree,
    handleMinOutdegreeChange,
  } = props;

  useEffect(() => {
    const _uberonVerticesAsArray: ICompartmentOmnibarItem[] = [];
    uberon?.forEach((v: OntologyTerm, id) => {
      _uberonVerticesAsArray.push({ uberonID: id, label: v.label });
    });
    function onlyUnique(value: ICompartmentOmnibarItem, index: number, self: ICompartmentOmnibarItem[]) {
      return self.indexOf(value) === index;
    }
    setUberonVerticesAsArray(_uberonVerticesAsArray.filter(onlyUnique));
  }, [uberon]);

  const handleSettingsOpen = () => setSettingsIsOpen(true);
  const handleSettingsClose = () => setSettingsIsOpen(false);
  const handleCompartmentSearchOpen = () => setCompartmentSearchIsOpenState(true);
  const handleCompartmentSearchClose = () => setCompartmentSearchIsOpenState(false);

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
          marginRight: 40,
        }}
      >
        cellxgene-ontology
      </p>
      <div style={{ marginRight: 20 }}>
        <InputGroup
          type="text"
          leftIcon="geosearch"
          placeholder="cell type search"
          disabled={simulationRunning}
          style={{
            fontSize: 14,
            marginRight: 20,
          }}
          onChange={(e) => {
            handleDagSearchChange(e);
          }}
          value={simulationRunning ? "computing layout..." : dagSearchText}
        />
      </div>

      {pinnedNode && !isSubset && (
        <Button icon="pie-chart" onClick={subsetToNode} style={{ marginRight: 20 }}>
          subset to {pinnedNode.id}
        </Button>
      )}
      {pinnedNode && isSubset && (
        <Button icon="full-circle" onClick={resetSubset} style={{ marginRight: 20 }}>
          reset to whole
        </Button>
      )}

      <Drawer
        isOpen={settingsIsOpen}
        size={560}
        onClose={handleSettingsClose}
        hasBackdrop={false}
        canOutsideClickClose={true}
        title="Graph configuration"
      >
        <div className={Classes.DRAWER_BODY}>
          <div className={Classes.DIALOG_BODY}>
            <p>
              Customizations to interface and interactivity. Some options have hotkeys, these are shown as (k). The
              hotkey (k) pulls up a menu of all hotkeys.
            </p>
            <h2> Interactivity </h2>
            <p>
              Change the behavior of interactions with the graph, such as hovering and hiding parts of the interface
            </p>
            <Checkbox
              checked={highlightAncestors}
              label={"Highlight ancestors of hovered cell (a)"}
              onChange={handleHighlightAncestorChange}
            />
            <Checkbox checked={true} label="Show cell type force graph" onChange={() => {}} disabled />
            <Checkbox checked={true} label="Show sugiyama directed cyclic graph" onChange={() => {}} disabled />
            <h2> Interpretive overlays </h2>
            <p>Show specific data on top of the graph to accomplish certain tasks</p>
            {/* <h4>Hulls</h4> */}
            <Checkbox checked={hullsEnabled} label="Show cell type hulls (h)" onChange={handleHullChange} />
            <Checkbox checked={false} label="Show compartment hulls (u)" onChange={() => {}} disabled />
            <Checkbox
              checked={showTabulaSapiensDataset}
              label="Show distribution of Tabula Sapiens cell types"
              onChange={handleShowTabulaSapiensChange}
            />
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
            <h4>Link pruning</h4>

            <RadioGroup
              label="Sometimes, links from parents to subchildren are helpful for tightening up highly related areas of the graph, in the case of x-->y-->z, this would be links between x and z. Other times, like from animal cell to thousands of descendants, this is undesireable and these nodes should be pruned. Setting this as a threshold facilitates both."
              onChange={() => {}}
              selectedValue={12345}
              disabled
            >
              <Radio label="10" value={10} />
              <Radio label="50" value={50} />
              <Radio label="100" value={250} />
              <Radio label="250" value={250} />
              <Radio label="1000" value={1000} />
              <Radio label="off" value={12345} />
            </RadioGroup>
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
      <Button style={{ marginRight: 20 }} onClick={handleCompartmentSearchOpen}>
        Compartment (c)
      </Button>
      <CompartmentOmnibar
        isOpen={compartmentSearchIsOpen}
        onClose={handleCompartmentSearchClose}
        onItemSelect={setCompartment}
        items={uberonVerticesAsArray}
        itemRenderer={renderCompartmentOption}
        itemPredicate={filterCompartment}
        noResults={<MenuItem disabled={true} text="No results." />}
        resetOnSelect={true}
      />
      <Button style={{ marginRight: 20 }} icon="settings" onClick={handleSettingsOpen} />
    </div>
  );
}

const renderCompartmentOption: ItemRenderer<ICompartmentOmnibarItem> = (
  compartment,
  { handleClick, modifiers, query }
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }

  return (
    <MenuItem label={compartment.uberonID} key={compartment.uberonID} onClick={handleClick} text={compartment.label} />
  );
};

const filterCompartment: ItemPredicate<ICompartmentOmnibarItem> = (query, compartment, _index, exactMatch) => {
  const normalizedTitle = compartment.label.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedTitle === normalizedQuery;
  } else {
    return `${compartment.label}`.indexOf(normalizedQuery) >= 0;
  }
};
