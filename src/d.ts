// This is the entire CL ontology converted to JavaScript map type
export interface IOntology extends Map<string, unknown | object> {}

export interface IVertex {
  [key: string]: {
    label: string;
    deprecated: boolean;
    ancestors: string[];
    descendants: string[];
  };
}

export interface IEBITerm {
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

export interface IEBITermAPIResponse {
  page: IEBITermPage;
  _embedded: IEBITermEmbedded;
  _links: IEBITermLinks;
}

interface IEBITermPage {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

interface IEBITermLinks {
  self: { href: string };
  first: { href: string };
  prev: { href: string };
  next: { href: string };
  last: { href: string };
}

export interface IEBITermEmbedded {
  terms: IEBITerm[];
}
