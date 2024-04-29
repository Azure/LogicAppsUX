import type { WorkflowDefinition } from './logicAppsV2';

type SkuType = 'Standard' | 'Consumption';

export interface Template {
  id: string;
  title: string;
  description?: string;
  skuType?: SkuType;
  data: TemplateData;
}

export interface TemplateData {
  definition: WorkflowDefinition;
  connections?: Record<string, TemplateConnection>;
  parameters?: Record<string, any>; //TODO: change this when working on parameters
}

export interface TemplateConnection {
  id: string;
  connectionId: string;
  connectionName: string;
}
