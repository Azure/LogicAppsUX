import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { ConnectionReference } from '../../../common/models/workflow';
import type { Template } from '@microsoft/logic-apps-shared';
export declare const useTemplateWorkflows: () => Record<string, WorkflowTemplateData>;
export declare const useWorkflowTemplate: (workflowId: string) => WorkflowTemplateData | undefined;
export declare const useTemplateManifest: () => Template.TemplateManifest | undefined;
export declare const useWorkflowBasicsEditable: (workflowId: string) => {
    isNameEditable: boolean;
    isKindEditable: boolean;
};
export declare const useConnectionReferenceForKey: (key: string) => ConnectionReference;
export declare const useTemplateConnections: () => Record<string, Template.Connection>;
export declare const useTemplateParameterDefinitions: () => Record<string, Template.ParameterDefinition>;
export declare const useFilteredTemplateNames: () => string[] | undefined;
