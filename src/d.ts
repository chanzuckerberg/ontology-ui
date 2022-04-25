// This is the entire CL ontology converted to JavaScript map type

export type OntologyPrefix = string; // eg "CL"
export type OntologyId = string; // OBO ID, eg "CL:000000"
export interface OntologyTerm {
  id: OntologyId; // OBO ID, eg, CL:0000000
  label: string; // eg, "heart cell"
  deprecated: boolean;
  parents: OntologyId[]; // immediate parents, within the same ontology
  children: OntologyId[];
  ancestors: Set<OntologyId>; // all ancestors, eg, parents, grandparents, ...
  descendants: Set<OntologyId>; // all descendants, eg, children, grandchildren, ...
  part_of: OntologyId[]; // part_of relations/link
  derives_from: OntologyId[];
  develops_from: OntologyId[];
  xref: OntologyId[]; // cross-ref & related terms - in this and other ontologies
  synonyms: string[];

  // Statistics & information from the dataset
  n_cells: number; // number of cells labelled with this term
  in_use: boolean; // term is in use in dataset (either directly, or in a sub-class)
}
export type Ontology = Map<OntologyId, OntologyTerm>;

/**
 * The ontologies used in a dataset, annotated with summary information
 * about the dataset.
 */
export interface DatasetGraph {
  dataset: string;
  created_on: string; // ISO8601 DateTime
  master_ontology_uri: string; // source of master (full) ontology
  lattice_uri: string; // source of xref lattice data
  ontologies: Record<OntologyPrefix, Ontology>;
}

export interface EBIOlsTerm {
  annotation: {
    created_by: string[];
    creation_date: string[];
    database_cross_reference: string[];
    definition: string[];
    has_broad_synonym: string[];
    has_exact_synonym: string[];
    has_obo_namespace: string[];
  };
  description: string[];
  has_children: boolean;
  in_subset: any;
  iri: string;
  is_defining_ontology: boolean;
  is_obsolete: boolean;
  is_preferred_root: boolean;
  is_root: boolean;
  label: string;
  obo_definition_citation: any;
  obo_id: string;
  obo_synonym: any;
  obo_xref: any;
  ontology_iri: string;
  ontology_name: string;
  ontology_prefix: string;
  short_form: string;
  synonyms: string[];
  term_replaced_by: any;
  _links: any;
}

export interface EBIOlsTermAPIResponse {
  page: EBIOlsTermPage;
  _embedded: EBIOlsTermEmbedded;
  _links: EBIOlsTermLinks;
}

interface EBIOlsTermPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

interface EBIOlsTermLinks {
  self: { href: string };
  first: { href: string };
  prev: { href: string };
  next: { href: string };
  last: { href: string };
}

export interface EBIOlsTermEmbedded {
  terms: EBIOlsTerm[];
}
