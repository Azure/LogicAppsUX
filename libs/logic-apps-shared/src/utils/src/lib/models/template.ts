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
  connections?: Record<string, any>; // TODO: this may change
  parameters?: Record<string, any>;
}
