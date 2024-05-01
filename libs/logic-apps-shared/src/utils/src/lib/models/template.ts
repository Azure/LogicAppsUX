type SkuType = 'Standard' | 'Consumption';

export interface Manifest {
  title: string;
  description: string;
  thumbnail?: string;
  skus: SkuType[];
  kinds: ('stateful' | 'stateless')[];
  artifacts: Artifact[];
  images: string[];
  parameters: Record<string, any>; //TODO: change this when working on parameters
  connections?: Record<string, TemplateConnection>;
}

export interface Artifact {
  type: string;
  file: string;
}

export interface TemplateConnection {
  id: string;
}
