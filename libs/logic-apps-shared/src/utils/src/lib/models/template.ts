export type SkuType = 'standard' | 'consumption';
export type Kind = 'stateful' | 'stateless';

export interface Manifest {
  title: string;
  description: string;
  thumbnail?: string;
  skus: SkuType[];
  kinds: Kind[];
  artifacts: Artifact[];
  images?: string[];
  parameters: Parameter[];
  connections: Connection[];
}

export interface Artifact {
  type: string;
  file: string;
}

export interface Parameter {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
}

export interface Connection {
  id: string;
}