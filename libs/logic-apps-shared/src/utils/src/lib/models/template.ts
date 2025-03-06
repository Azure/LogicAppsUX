export type SkuType = 'standard' | 'consumption';
export type WorkflowKindType = 'stateful' | 'stateless';
export type ConnectorRuntimeType = 'inapp' | 'shared' | 'custom';
export type FeaturedConnectorType = ConnectorRuntimeType | 'builtin';

export type DetailsType = 'By' | 'Type' | 'Category' | 'Trigger';

export interface TemplateManifest {
  id: string;
  title: string;
  summary: string;
  /* This is a markdown to show features for multi-workflow */
  description?: string;
  artifacts?: Artifact[];
  skus: SkuType[];

  /* This consists of list of workflows listed in the multi-workflow template.
  The key is the folder name, followed by metadata where name is default name to be used for creation */
  workflows: Record<string, { name: string }>;
  featuredConnectors?: FeaturedConnector[];
  details: {
    By: string;
    Type: string;
    Category: string;
    Trigger?: string;
  };
  tags?: string[];
  sourceCodeUrl?: string; // Automatically generated for public templates, otherwise not present
}

export interface WorkflowManifest {
  id: string;
  title: string;
  summary: string;
  description?: string;
  prerequisites?: string;
  kinds?: WorkflowKindType[];
  artifacts?: Artifact[];
  images: {
    light: string;
    dark: string;
  };
  parameters: Parameter[];
  connections: Record<string, Connection>;

  sourceCodeUrl?: string; // Automatically generated for public templates, otherwise optional
}

export interface Artifact {
  type: string;
  file: string;
}

export interface Parameter {
  name: string;
  type: string;
  default?: any;
  description: string;
  required?: boolean;
  displayName: string;
  value?: any;
  allowedValues?: { value: any; displayName: string }[];
  dynamicData?: {
    type: 'picker' | 'list';
    workflow: string;
    operation: string;
    connection?: string;
  };
}

export interface ParameterDefinition extends Parameter {
  associatedWorkflows?: string[];
  associatedOperationParameter?: {
    operationId: string;
    parameterId: string;
  };
}

export interface Connection {
  connectorId: string;
  kind?: ConnectorRuntimeType;
}

export interface FeaturedConnector {
  id: string;
  kind?: FeaturedConnectorType;
}

export interface TemplateContext {
  templateId: string;
  workflowAppName?: string;
  isMultiWorkflow: boolean;
}

interface ContentInfo<T> {
  value: T;
  isEditable?: boolean;
}

export interface ViewTemplateDetails {
  id: string;
  basicsOverride?: Record<
    string,
    {
      name?: ContentInfo<string>;
      kind?: ContentInfo<WorkflowKindType>;
    }
  >;
  parametersOverride?: Record<string, ContentInfo<any>>;
}
