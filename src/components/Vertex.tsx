import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { olsLookupTermByOboId } from "../util/fetchEBITerm";
import { EBIOlsTerm, Ontology, OntologyTerm } from "../d";

export interface VertexProps {
  ontology: Ontology;
  lattice: Ontology;
  vertex: OntologyTerm;
  query?: string;
}

export default function Vertex({ ontology, lattice, vertex, query }: VertexProps) {
  const [olsTerm, setOlsTerm] = useState<EBIOlsTerm | null>();
  const vertexID = vertex.id;
  query = query ? "?" + query : "";

  useEffect(() => {
    olsLookupTermByOboId(vertexID)
      .then((terms) => setOlsTerm(terms[0] ?? null))
      .catch(() => {
        setOlsTerm(null);
        console.log("EBI OLS request failed");
      });
  }, [vertexID]);

  /* A mechanoreceptor cell located in the inner ear that is sensitive to auditory stimuli. The ... */
  const definition = olsTerm && olsTerm.annotation.definition && olsTerm.annotation.definition[0];

  /*
   * Look up any cross-referenced terms
   *
   * TODO: currently, we restrict cross-refs to UBERON, but this should eventually
   * be a component parameter allowing any other ontology to specified for cross-
   * referencing.
   *
   * See OntologyExplorer - it has been generalized to represent this as a
   * "cross reference ontology" rather than hard-wired to UBERON.
   */
  const _lattice = lattice.get(vertexID);
  const _filteredLattice = _lattice?.xref.filter?.((d: string) => d.includes("UBERON"));

  return (
    <div>
      <h1>{vertex && vertex.label}</h1>
      <h5>Count: {vertex && vertex.n_cells ? vertex.n_cells : "0"}</h5>

      <p>{!olsTerm && "Loading..."}</p>
      <p>{olsTerm && definition}</p>
      <pre>{vertexID}</pre>

      <h3> Ancestors </h3>

      <ol>
        {vertex &&
          vertex.ancestors.map((ancestor: string) => {
            const _a: OntologyTerm | undefined = ontology.get(ancestor);
            if (!_a || !_a.label) {
              console.log(
                "In vertex.tsx, while rendering ancestors, ontology.get failed to return a vertex, possible bad ID"
              );
              return null;
            }
            return (
              <li key={ancestor}>
                <Link to={"../" + ancestor + query}>{_a.label}</Link>
              </li>
            );
          })}
      </ol>

      <h3> Descendants </h3>
      <ol>
        {vertex &&
          vertex.descendants.map((descendant: string, i: number) => {
            const _d = ontology.get(descendant);
            if (!_d || !_d.label) {
              console.log(
                "In vertex.tsx, while rendering descendants, ontology.get failed to return a vertex, possible bad ID"
              );
              return null;
            }
            return (
              <li key={descendant}>
                <Link to={"../" + descendant + query}> {_d.label} </Link>
              </li>
            );
          })}
      </ol>

      <h3> Compartments </h3>
      <ol>
        {_filteredLattice &&
          _filteredLattice.map((uberonID: string) => {
            const _u: OntologyTerm | undefined = lattice.get(uberonID);
            if (!_u || !_u.label) {
              console.log(
                "In vertex.tsx, while rendering lattice uberon compartments, lattice.get failed to return a vertex, possible bad ID"
              );
              return null;
            }
            return (
              <li key={uberonID}>
                <Link to={`/compartment/${uberonID}`}> {_u.label} </Link>
              </li>
            );
          })}
      </ol>
    </div>
  );
}
