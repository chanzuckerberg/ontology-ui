import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { olsLookupTermByOboId } from "../util/fetchEBITerm";
import { DatasetGraph, EBIOlsTerm, OntologyTerm, OntologyId } from "../d";
import { ontologyLookupId, ontologyQuery, LinkNames } from "../util/ontologyDag";
import { SearchTerm } from "./OntologyExplorer/searchSidebar";
import { Button, Icon } from "@blueprintjs/core";

export interface VertexProps {
  graph: DatasetGraph;
  vertex: OntologyTerm;
  query?: string;
  makeTo: (to: OntologyId) => string;
  searchTerms?: SearchTerm[];
  setSearchTerms?: (searches: SearchTerm[]) => void;
}

export default function Vertex({ graph, vertex, query, makeTo, searchTerms, setSearchTerms }: VertexProps) {
  const vertexID = vertex.id;
  const ontoID = vertexID?.split(":", 1)[0];
  const ontology = graph.ontologies[ontoID];
  query = query ? "?" + query : "";

  const [olsTerm, setOlsTerm] = useState<EBIOlsTerm | null>();

  useEffect(() => {
    let cancelled = false;
    olsLookupTermByOboId(vertexID)
      .then((terms) => !cancelled && setOlsTerm(terms[0] ?? null))
      .catch(() => {
        if (!cancelled) setOlsTerm(null);
        console.log("EBI OLS request failed");
      });

    return () => {
      // we don't want to fully cancel the fetch, as we will cache the
      // result for future use.
      cancelled = true;
    };
  }, [vertexID]);

  /* A mechanoreceptor cell located in the inner ear that is sensitive to auditory stimuli. The ... */
  const definition = olsTerm && olsTerm.annotation.definition && olsTerm.annotation.definition[0];

  return (
    <div>
      <h1>
        {vertex && vertex.label}{" "}
        {searchTerms && setSearchTerms && (
          <Button
            minimal
            icon={<Icon icon={"search"} iconSize={16} />}
            style={{ position: "relative", top: -1.5, left: -2 }}
            onClick={() => {
              setSearchTerms([
                ...searchTerms,
                { highlight: true, searchString: vertex.label, searchMode: "celltype", filterMode: "none" },
              ]);
            }}
          />
        )}
      </h1>
      <h5>Count: {vertex && vertex.n_cells ? vertex.n_cells : "0"}</h5>
      <p>{!olsTerm && "Loading..."}</p>
      <p>{olsTerm && definition}</p>
      <pre>
        {vertexID}{" "}
        {searchTerms && setSearchTerms && (
          <Button
            small
            minimal
            icon={<Icon icon={"search"} iconSize={10} />}
            style={{ position: "relative", top: -1.5, left: -2 }}
            onClick={() => {
              setSearchTerms([
                ...searchTerms,
                { highlight: true, searchString: vertexID, searchMode: "celltype", filterMode: "none" },
              ]);
            }}
          />
        )}
      </pre>

      {vertex.synonyms.length > 1 && (
        <p style={{ fontStyle: "italic", color: "grey", fontSize: 10 }}>
          Synonyms:{" "}
          <span>
            {vertex.synonyms.map((s) => {
              return s;
            })}
          </span>
        </p>
      )}

      <h3> Parents </h3>
      <ul>
        {vertex &&
          vertex.parents.map((ancestor: string) => {
            const _a: OntologyTerm | undefined = ontology.get(ancestor);
            if (!_a || !_a.label) {
              console.log(
                "In vertex.tsx, while rendering parents, ontology.get failed to return a vertex, possible bad ID"
              );
              return null;
            }
            return (
              <li key={ancestor}>
                <Link to={makeTo(ancestor)}>{_a.label}</Link>
              </li>
            );
          })}
      </ul>
      <h3> Children </h3>
      <ul>
        {vertex &&
          vertex.children.map((child: string, i: number) => {
            const _d = ontology.get(child);
            if (!_d || !_d.label) {
              console.log(
                "In vertex.tsx, while rendering children, ontology.get failed to return a vertex, possible bad ID"
              );
              return null;
            }
            return (
              <li key={child}>
                <Link to={makeTo(child)}>{_d.label}</Link>
              </li>
            );
          })}
      </ul>
      <h3>???? Part-of (compartment)</h3>
      <ul>
        {vertex &&
          allUniqueAncestors(graph, ontoID, vertex, "part_of").map((id: string, i: number) => {
            const term = ontologyLookupId(graph.ontologies, id)?.term;
            return (
              <li key={id}>
                <Link to={makeTo(id)}>{term!.label}</Link>
                {searchTerms && setSearchTerms && (
                  <Button
                    small
                    minimal
                    icon={<Icon icon={"search"} iconSize={10} />}
                    style={{ marginLeft: 4 }}
                    onClick={() => {
                      setSearchTerms([
                        ...searchTerms,
                        { highlight: true, searchString: term!.label, searchMode: "compartment", filterMode: "none" },
                      ]);
                    }}
                  />
                )}
              </li>
            );
          })}
      </ul>
      <h3> Derived-from</h3>
      <ul>
        {vertex &&
          allUniqueAncestors(graph, ontoID, vertex, "derives_from").map((id: string, i: number) => {
            const term = ontologyLookupId(graph.ontologies, id)?.term;
            return (
              <li key={id}>
                <Link to={makeTo(id)}>{term!.label}</Link>{" "}
              </li>
            );
          })}
      </ul>
      <h3> Develops-from</h3>
      <ul>
        {vertex &&
          allUniqueAncestors(graph, ontoID, vertex, "develops_from").map((id: string, i: number) => {
            const term = ontologyLookupId(graph.ontologies, id)?.term;
            return (
              <li key={id}>
                <Link to={makeTo(id)}>{term!.label}</Link>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

function allUniqueAncestors(graph: DatasetGraph, ontoID: string, vertex: OntologyTerm, link: LinkNames): OntologyId[] {
  return [
    ...ontologyQuery(
      graph.ontologies,
      {
        $walk: vertex[link],
        $on: link,
      },
      ontoID
    ),
  ];
}
