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
