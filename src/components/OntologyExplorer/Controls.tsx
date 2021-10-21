import React from "react";
import emoji from "react-easy-emoji";

import { majorCompartments } from "../../majorCompartments";

import { IOntology, IVertex } from "../../d";

import {
  Button,
  Classes,
  Code,
  Divider,
  Drawer,
  DrawerSize,
  H5,
  HTMLSelect,
  OptionProps,
  Label,
  Position,
  Switch,
  InputGroup,
  Checkbox,
} from "@blueprintjs/core";

interface IProps {
  pinnedNode: IVertex;
  dagSearchText: string;
  simulationRunning: boolean;
  menubarHeight: number;
  isSubset: boolean;
  outdegreeCutoffNodes: number;
  uberon: null | IOntology;
  handleDagSearchChange: any;
  subsetToNode: any;
  handleOutdegreeCutoffChange: any;
  resetSubset: any;
  setCompartment: any;
  handleHullChange: any;
  hullsEnabled: boolean;
  highlightAncestors: boolean;
  handleHighlightAncestorChange: any;
  showTabulaSapiensDataset: boolean;
  handleShowTabulaSapiensChange: any;
}

interface IState {
  isOpen: boolean;
}

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      isOpen: true,
    };
  }

  render() {
    const {
      pinnedNode,
      dagSearchText,
      simulationRunning,
      menubarHeight,
      isSubset,
      outdegreeCutoffNodes,
      uberon,
      handleDagSearchChange,
      handleOutdegreeCutoffChange,
      subsetToNode,
      resetSubset,
      setCompartment,
      hullsEnabled,
      handleHullChange,
      highlightAncestors,
      handleHighlightAncestorChange,
      showTabulaSapiensDataset,
      handleShowTabulaSapiensChange,
    } = this.props;

    const { isOpen } = this.state;

    return (
      <div
        id="menubar"
        style={{
          height: menubarHeight,
          // border: "1px solid lightblue",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 900,
              margin: 0,
              marginRight: 10,
              padding: 0,
            }}
          >
            cellxgene-ontology
          </p>
          <InputGroup
            type="text"
            placeholder="Substring search"
            style={{
              fontSize: 14,
              margin: 0,
              marginRight: 10,
            }}
            onChange={(e) => {
              handleDagSearchChange(e);
            }}
            value={simulationRunning ? "Computing layout..." : dagSearchText}
          />

          {pinnedNode && !isSubset && (
            <Button
              icon="pie-chart"
              onClick={subsetToNode}
              style={{ marginRight: 10 }}
            >
              subset to {pinnedNode.id}
            </Button>
          )}
          {pinnedNode && isSubset && (
            <Button
              icon="full-circle"
              onClick={resetSubset}
              style={{ marginRight: 10 }}
            >
              reset to whole
            </Button>
          )}

          <Drawer
            isOpen={isOpen}
            size={560}
            onClose={this.handleClose}
            hasBackdrop={false}
            canOutsideClickClose={true}
            title="Graph configuration"
          >
            <div className={Classes.DRAWER_BODY}>
              <div className={Classes.DIALOG_BODY}>
                <h4>Reproject the ontology</h4>
                <p>Different tasks require different parameters. </p>
                <h4>Hulls</h4>
                <Checkbox
                  checked={hullsEnabled}
                  label="Show hulls"
                  onChange={handleHullChange}
                />
                <h4>Node size</h4>
                <h4>Force layout, radial or tree</h4>
                <h4>Dataset</h4>
                <Checkbox
                  checked={showTabulaSapiensDataset}
                  label="Show distribution of Tabula Sapiens cell types"
                  onChange={handleShowTabulaSapiensChange}
                />
                <h4>Highlight ancestors</h4>
                <Checkbox
                  checked={highlightAncestors}
                  label="Show ancestors on hover"
                  onChange={handleHighlightAncestorChange}
                />
                <h4>Automatic highlighting</h4>
                <p>Show descendants, show ancestors</p>
                <h2> Graph filtering & subsetting </h2>
                <h4>Organism</h4>
                <p>
                  You can subset to a contiguous sugraph by clicking any node
                  and clicking subset
                </p>
                <Checkbox
                  checked={true}
                  label="Remove mouse nodes"
                  onChange={() => {}}
                  disabled
                />
                <Checkbox
                  checked={true}
                  label="Remove fungal nodes"
                  onChange={() => {}}
                  disabled
                />
                <h4>Naive substring subset</h4>
                <p></p>
                <h4>Colors</h4>
                Hover, click,
                <h4>Link pruning</h4>
                <p>{`Sometimes, links from parents to subchildren are helpful for tightening up highly related areas of the graph, in the case of x-->y-->z, this would be links between x and z. Other times, like from animal cell to thousands of descendants, this is undesireable and these nodes should be pruned. Setting this as a threshold facilitates both.`}</p>
              </div>
            </div>
            <div className={Classes.DRAWER_FOOTER}>Footer</div>
          </Drawer>
          <Button>Compartment</Button>
          <Button icon="settings" onClick={this.handleOpen} />
        </div>
      </div>
    );
  }

  private handleOpen = () => this.setState({ isOpen: true });
  private handleClose = () => this.setState({ isOpen: false });
}

export default OntologyExplorer;

// <p style={{ marginLeft: 50 }}>
// Remove nodes if outdegree greater than:
// </p>
// <InputGroup
// type="text"
// onChange={handleOutdegreeCutoffChange}
// value={`${outdegreeCutoffNodes}`}
// id="changeOutdegreeCutoffNodes"
// />
// {uberon &&
// majorCompartments.map((compartmentID: string) => {
//   const _compartment: any = uberon.get(compartmentID);
//   if (_compartment && _compartment.label) {
//     return (
//       <Button
//         key={compartmentID}
//         onClick={() => {
//           setCompartment(compartmentID);
//         }}
//         type="button"
//       >
//         {_compartment.label}
//       </Button>
//     );
//   } else {
//     return null;
//   }
// })}
// <p>
// <strong>Hooking up live data</strong>
// </p>
// <p>Ways to make the graph cleaner</p>
// <p>Some guidance</p>
// <p>What you can do with this</p>
