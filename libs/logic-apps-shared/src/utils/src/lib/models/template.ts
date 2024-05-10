const SkuType = ['standard', 'consumption'];
export type SkuType = (typeof SkuType)[keyof typeof SkuType];
const Kind = ['stateful', 'stateless'];
export type Kind = (typeof Kind)[keyof typeof Kind];

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

export interface ParameterDefinition extends Parameter {
  value?: any;
}

export interface Connection {
  id: string;
}
