import React from "react";

import { Ontology, OntologyTerm } from "../../d";
import {
  Button,
  Classes,
  Drawer,
  RadioGroup,
  Radio,
  InputGroup,
  Checkbox,
  MenuItem,
} from "@blueprintjs/core";
import { OntologyVertexDatum } from ".";

import {
  ItemRenderer,
  ItemPredicate,
  Omnibar,
} from "@blueprintjs/select";

interface IProps {
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

interface IState {
  settingsIsOpen: boolean;
  compartmentSearchIsOpen: boolean;
  uberonVerticesAsArray: ICompartmentOmnibarItem[];
}

interface ICompartmentOmnibarItem {
  uberonID: string;
  label: string;
}

const CompartmentOmnibar = Omnibar.ofType<ICompartmentOmnibarItem>();

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      settingsIsOpen: false,
      compartmentSearchIsOpen: false,
      uberonVerticesAsArray: [],
    };
  }

  componentDidMount = () => {
    const { uberon } = this.props;
    const _uberonVerticesAsArray: ICompartmentOmnibarItem[] = [];

    uberon?.forEach((v: OntologyTerm, id) => {
      _uberonVerticesAsArray.push({ uberonID: id, label: v.label });
    });

    function onlyUnique(
      value: ICompartmentOmnibarItem,
      index: number,
      self: ICompartmentOmnibarItem[]
    ) {
      return self.indexOf(value) === index;
    }

    this.setState({
      uberonVerticesAsArray: _uberonVerticesAsArray.filter(onlyUnique),
    });
  };

  render() {
    const {
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
    } = this.props;

    const { settingsIsOpen, compartmentSearchIsOpen, uberonVerticesAsArray } =
      this.state;

    return (
      <div
        id="menubar"
        style={{
          height: menubarHeight,
          // border: "1px solid lightblue",
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
          <Button
            icon="pie-chart"
            onClick={subsetToNode}
            style={{ marginRight: 20 }}
          >
            subset to {pinnedNode.id}
          </Button>
        )}
        {pinnedNode && isSubset && (
          <Button
            icon="full-circle"
            onClick={resetSubset}
            style={{ marginRight: 20 }}
          >
            reset to whole
          </Button>
        )}

        <Drawer
          isOpen={settingsIsOpen}
          size={560}
          onClose={this.handleSettingsClose}
          hasBackdrop={false}
          canOutsideClickClose={true}
          title="Graph configuration"
        >
          <div className={Classes.DRAWER_BODY}>
            <div className={Classes.DIALOG_BODY}>
              <p>
                Customizations to interface and interactivity. Some options have
                hotkeys, these are shown as (k). The hotkey (k) pulls up a menu
                of all hotkeys.
              </p>
              <h2> Interactivity </h2>
              <p>
                Change the behavior of interactions with the graph, such as
                hovering and hiding parts of the interface
              </p>
              <Checkbox
                checked={highlightAncestors}
                label={"Highlight ancestors of hovered cell (a)"}
                onChange={handleHighlightAncestorChange}
              />
              <Checkbox
                checked={true}
                label="Show cell type force graph"
                onChange={() => {}}
                disabled
              />
              <Checkbox
                checked={true}
                label="Show sugiyama directed cyclic graph"
                onChange={() => {}}
                disabled
              />
              <h2> Interpretive overlays </h2>
              <p>
                Show specific data on top of the graph to accomplish certain
                tasks
              </p>
              {/* <h4>Hulls</h4> */}
              <Checkbox
                checked={hullsEnabled}
                label="Show cell type hulls (h)"
                onChange={handleHullChange}
              />
              <Checkbox
                checked={false}
                label="Show compartment hulls (u)"
                onChange={() => {}}
                disabled
              />
              <Checkbox
                checked={showTabulaSapiensDataset}
                label="Show distribution of Tabula Sapiens cell types"
                onChange={handleShowTabulaSapiensChange}
              />
              <h2> Cell type filtering &amp; subsetting </h2>
              <p>
                You can subset to a contiguous sugraph by clicking any node and
                clicking subset. Click any cell type
              </p>
              <h4>Organism</h4>
              <Checkbox
                checked={true}
                label="Remove mouse cell types"
                onChange={() => {}}
                disabled
              />
              <Checkbox
                checked={true}
                label="Remove fungal cell types"
                onChange={() => {}}
                disabled
              />
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
              <Checkbox
                checked={false}
                label="Show aggregator nodes for min"
                onChange={() => {}}
                disabled
              />
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
              <Checkbox
                checked={false}
                label="Show aggregator nodes for max"
                onChange={() => {}}
                disabled
              />
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
              <RadioGroup
                label=""
                onChange={() => {}}
                selectedValue={"tree"}
                disabled
              >
                <Radio label="Radial" value="radial" />
                <Radio label="Tree" value="tree" />
              </RadioGroup>
              <h2>Colors</h2>
            </div>
          </div>
          <div className={Classes.DRAWER_FOOTER}>A lovely footer</div>
        </Drawer>
        <Button
          style={{ marginRight: 20 }}
          onClick={this.handleCompartmentSearchOpen}
        >
          Compartment (c)
        </Button>
        <CompartmentOmnibar
          isOpen={compartmentSearchIsOpen}
          onClose={this.handleCompartmentSearchClose}
          onItemSelect={setCompartment}
          items={uberonVerticesAsArray}
          itemRenderer={this.renderCompartmentOption}
          itemPredicate={this.filterCompartment}
          noResults={<MenuItem disabled={true} text="No results." />}
          resetOnSelect={true}
        />
        <Button
          style={{ marginRight: 20 }}
          icon="settings"
          onClick={this.handleSettingsOpen}
        />
      </div>
    );
  }

  renderCompartmentOption: ItemRenderer<ICompartmentOmnibarItem> = (
    compartment,
    { handleClick, modifiers, query }
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    return (
      <MenuItem
        label={compartment.uberonID}
        key={compartment.uberonID}
        onClick={handleClick}
        text={compartment.label}
      />
    );
  };

  escapeRegExpChars = (text: string) => {
    return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
  };

  filterCompartment: ItemPredicate<ICompartmentOmnibarItem> = (
    query,
    compartment,
    _index,
    exactMatch
  ) => {
    const normalizedTitle = compartment.label.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    if (exactMatch) {
      return normalizedTitle === normalizedQuery;
    } else {
      return `${compartment.label}`.indexOf(normalizedQuery) >= 0;
    }
  };

  private handleSettingsOpen = () => this.setState({ settingsIsOpen: true });
  private handleSettingsClose = () => this.setState({ settingsIsOpen: false });

  private handleCompartmentSearchOpen = () =>
    this.setState({ compartmentSearchIsOpen: true });
  private handleCompartmentSearchClose = () =>
    this.setState({ compartmentSearchIsOpen: false });
}

export default OntologyExplorer;
