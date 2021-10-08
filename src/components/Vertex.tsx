import React from "react";
import { Link } from "react-router-dom";
import fetchEBITerm from "../util/fetchEBITerm";
import { IEBITerm, IEBITermAPIResponse, ILatticeTerm } from "../d";

interface IProps {
  ontologyName: string;
  ontology: any;
  lattice: any;
  vertex: any;
  vertexID: string;
}

interface IState {
  term: null | IEBITerm;
}

class Vertex extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { term: null };
  }

  async componentDidMount() {
    this.doGetEBITerm();
  }

  async componentDidUpdate(prevProps: IProps) {
    const { vertexID } = this.props;
    if (prevProps.vertexID !== vertexID) {
      this.setState({ term: null });
      this.doGetEBITerm();
    }
  }

  doGetEBITerm = async () => {
    const { vertexID, ontologyName } = this.props;
    let _ebiResponse: IEBITermAPIResponse;
    try {
    // call the ebi api
      _ebiResponse = await fetchEBITerm(vertexID);
    // filter down the terms to the ontology we're in
    // this call returns every ontology the term appears in
    const term: IEBITerm = _ebiResponse._embedded.terms.filter(
      (term: IEBITerm) => {
        return term.ontology_name === ontologyName; /* ie., === cl */
      }
    )[0];
    this.setState({ term });
    } catch {
      console.log("ebi request failed");
    }
  };

  render() {
    const { vertexID, vertex, ontology, lattice } = this.props;
    const { term } = this.state;

    /* A mechanoreceptor cell located in the inner ear that is sensitive to auditory stimuli. The ... */
    const definition =
      term && term.annotation.definition && term.annotation.definition[0];

    /* UBERON compartment linkage, if present */
    const _lattice: ILatticeTerm | any = lattice.get(vertexID);

    let _filteredLattice: string[] | null = null;

    if (_lattice) {
      _filteredLattice = _lattice.ancestors.filter((d: string) =>
        d.includes("UBERON")
      );
    }

    return (
      <div style={{ position: "absolute", right: 100, top: 0, width: 350 }}>
        <h1>{vertex.label}</h1>
        <p>{!term && "Loading..."}</p>
        <p>{term && definition}</p>

        <h3> Ancestors </h3>

        <ol>
          {vertex.ancestors.map((ancestor: string) => {
            const _a: any = ontology.get(ancestor);
            return (
              <li key={ancestor}>
                <Link to={ancestor}>{_a.label}</Link>
              </li>
            );
          })}
        </ol>

        <h3> Descendents </h3>
        <ol>
          {vertex.descendants.map((descendant: string) => {
            const _d: any = ontology.get(descendant);
            return (
              <li key={descendant}>
                <Link to={descendant}> {_d.label} </Link>
              </li>
            );
          })}
        </ol>

        <h3> Compartments </h3>
        <ol>
          {_filteredLattice &&
            _filteredLattice.map((uberonID: string) => {
              const _u: any = lattice.get(uberonID);
              if (_u && _u.name) {
                return (
                  <li key={_u.name}>
                    <Link to={`/compartment/${uberonID}`}> {_u.name} </Link>
                  </li>
                );
              }
            })}
        </ol>
      </div>
    );
  }
}

export default Vertex;
