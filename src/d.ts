export interface Vertex {
  [key: string]: {
    label: string;
    deprecated: boolean;
    ancestors: string[];
  };
}
