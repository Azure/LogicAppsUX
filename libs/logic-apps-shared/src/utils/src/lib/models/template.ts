export type SkuType = 'standard' | 'consumption';
export type Kind = 'stateful' | 'stateless';

export interface Manifest {
  title: string;
  description: string;
  thumbnail?: string;
  skus: SkuType[];
  kinds: Kind[];
  artifacts: Artifact[];
  images: string[];
  parameters: Record<string, any>; //TODO: change this when working on parameters
  connections?: Record<string, Connection>;
}

export interface Artifact {
  type: string;
  file: string;
}

export interface Connection {
  id: string;
}
