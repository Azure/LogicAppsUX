export type SkuType = 'standard' | 'consumption';
export type WorkflowKindType = 'stateful' | 'stateless';
export type ConnectorRuntimeType = 'inapp' | 'shared';

export interface Manifest {
  title: string;
  description: string;
  skus: SkuType[];
  kinds?: WorkflowKindType[];
  details: Record<string, string>;

  /* This is a markdown to show features for multi-workflow and details in case of single workflow */
  detailsDescription?: string;

  tags?: string[];
  artifacts: Artifact[];

  /* This consists of list of workflows listed in the multi-workflow template.
  The key is the folder name, followed by metadata where name is default name to be used for creation */
  workflows?: Record<string, { name: string }>;

  images: Record<string, string>;
  prerequisites?: string;
  parameters: Parameter[];
  connections: Record<string, Connection>;
  featuredOperations?: { type: string; kind?: string }[];
  sourceCodeUrl?: string; // Automatically generated for public templates, otherwise optional
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
  displayName: string;
  value?: any;
  allowedValues?: { value: any; displayName: string }[];
}

export interface ParameterDefinition extends Parameter {
  associatedWorkflows?: string[];
}

export interface Connection {
  connectorId: string;
  kind?: ConnectorRuntimeType;
}

export interface TemplateContext {
  templateId: string;
  workflowAppName?: string;
  isMultiWorkflow: boolean;
}
