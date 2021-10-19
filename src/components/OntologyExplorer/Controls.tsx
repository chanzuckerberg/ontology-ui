import React from "react";

import { majorCompartments } from "../../majorCompartments";

import { IOntology, IVertex } from "../../d";

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
}

interface IState {}

class OntologyExplorer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {};
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
    } = this.props;

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
            justifyContent: "flex-start",
            alignItems: "baseline",
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
          <input
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
          <p style={{ marginLeft: 50 }}>
            Remove nodes if outdegree greater than:
          </p>
          <p>1</p>
          <input
            type="range"
            onChange={handleOutdegreeCutoffChange}
            min="1"
            max="5000"
            value={outdegreeCutoffNodes}
            id="changeOutdegreeCutoffNodes"
          />
          <p style={{ marginRight: 50 }}>Max (tbd, 5000)</p>

          {pinnedNode && !isSubset && (
            <button onClick={subsetToNode} style={{ marginRight: 10 }}>
              subset to {pinnedNode.id}
            </button>
          )}
          {pinnedNode && isSubset && (
            <button onClick={resetSubset} style={{ marginRight: 10 }}>
              reset to whole
            </button>
          )}
          {uberon &&
            majorCompartments.map((compartmentID: string) => {
              const _compartment: any = uberon.get(compartmentID);
              if (_compartment && _compartment.label) {
                return (
                  <button
                    key={compartmentID}
                    onClick={() => {
                      setCompartment(compartmentID);
                    }}
                    type="button"
                  >
                    {_compartment.label}
                  </button>
                );
              } else {
                return null;
              }
            })}
          <p>help</p>
        </div>
      </div>
    );
  }
}

export default OntologyExplorer;
