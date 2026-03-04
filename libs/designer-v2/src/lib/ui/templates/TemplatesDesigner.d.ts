import type { LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import type { TemplateDetailFilterType } from './filters/templatesearchfilters';
import type { ConnectionMapping } from '../../core/state/templates/workflowSlice';
export type CreateWorkflowHandler = (workflows: {
    id: string;
    name: string | undefined;
    kind: string | undefined;
    definition: LogicAppsV2.WorkflowDefinition;
}[], connectionsMapping: ConnectionMapping, parametersData: Record<string, Template.ParameterDefinition>) => Promise<void>;
export interface TemplatesDesignerProps {
    detailFilters: TemplateDetailFilterType;
    isWorkflowEmpty?: boolean;
    createWorkflowCall: CreateWorkflowHandler;
}
export declare const TemplatesDesigner: (props: TemplatesDesignerProps) => import("react/jsx-runtime").JSX.Element;
