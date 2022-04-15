// This is the entire CL ontology converted to JavaScript map type

export type OntologyPrefix = string; // eg "CL"
export type OntologyId = string; // eg "CL:000000"
export interface OntologyTerm {
  id: OntologyId; // eg, CL:0000000
  label: string; // eg, "heart cell"
  deprecated: boolean;
  ancestors: OntologyId[]; // ancestor terms -- within the same ontology
  descendants: OntologyId[];
  xref: OntologyId[]; // cross-ref & related terms - in this and other ontologies (includes ancestors).
  synonyms: string[];

  // Statistics & information from the dataset
  n_cells: number; // number of cells labelled with this term
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

export interface EBITerm {
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

export interface EBITermAPIResponse {
  page: EBITermPage;
  _embedded: EBITermEmbedded;
  _links: EBITermLinks;
}

interface EBITermPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

interface EBITermLinks {
  self: { href: string };
  first: { href: string };
  prev: { href: string };
  next: { href: string };
  last: { href: string };
}

export interface EBITermEmbedded {
  terms: EBITerm[];
}
