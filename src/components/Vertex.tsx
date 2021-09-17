import React from "react";
import { Link } from "react-router-dom";
import fetchEBITerm from "../util/fetchEBITerm";
import { IEBITerm, IEBITermAPIResponse } from "../d";
interface IProps {
  ontology: Map<string, unknown | object>;
  vertex: any;
  vertexID: string;
}

interface IState {
  cl: null | IEBITerm;
  uberon: null | IEBITerm;
}

class Vertex extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { cl: null, uberon: null };
  }

  async componentDidMount() {
    this.doGetEBITerm();
  }

  async componentDidUpdate(prevProps: IProps) {
    const { vertexID } = this.props;
    if (prevProps.vertexID !== vertexID) {
      this.setState({ cl: null, uberon: null });
      this.doGetEBITerm();
    }
  }

  doGetEBITerm = async () => {
    const { vertexID } = this.props;
    // call the ebi api
    const _ebiResponse: IEBITermAPIResponse = await fetchEBITerm(vertexID);
    // filter down the terms to only cl and uberon ontologies,
    const cl: IEBITerm = _ebiResponse._embedded.terms.filter(
      (term: IEBITerm) => {
        return term.ontology_name === "cl";
      }
    )[0];
    const uberon: IEBITerm = _ebiResponse._embedded.terms.filter(
      (term: IEBITerm) => {
        return term.ontology_name === "uberon";
      }
    )[0];

    this.setState({ cl, uberon });
  };

  render() {
    const { ontology, vertex } = this.props;
    const { cl, uberon } = this.state;

    const definition =
      cl && cl.annotation.definition && cl.annotation.definition[0];

    console.log("cl", cl);
    console.log("uberon", uberon);

    return (
      <div>
        <h1>{vertex.label}</h1>
        <p>{!cl && "Loading..."}</p>
        <p>{cl && definition}</p>

        <h3> Ancestors </h3>

        <ul>
          {vertex.ancestors.map((ancestor: string) => {
            const _a: any = ontology.get(ancestor);
            return (
              <li key={ancestor}>
                <Link to={ancestor}>{_a.label}</Link>
              </li>
            );
          })}
        </ul>

        <h3> Descendents </h3>
        <ol>
          {vertex.descendants.map((descendant: string) => {
            const _d: any = ontology.get(descendant);
            // if (_d.label.contains("mouse") || _d.label.contains("human")) return
            return (
              <li key={descendant}>
                <Link to={descendant}> {_d.label} </Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
}

export default Vertex;
