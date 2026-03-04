import { type LogicAppsV2, type Template } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences, WorkflowParameter } from '../../../common/models/workflow';
interface WorkflowPayload {
    definition: LogicAppsV2.WorkflowDefinition;
    parameters: Record<string, WorkflowParameter>;
    connections?: ConnectionReferences;
    metadata?: Record<string, any>;
    connectionReferences?: ConnectionReferences;
}
export declare const getConsumptionWorkflowPayloadForCreate: (definition: LogicAppsV2.WorkflowDefinition, parameterDefinitions: Record<string, Template.ParameterDefinition>, connections: {
    references: ConnectionReferences;
    mapping: Record<string, string>;
}, templateName: string, replaceIdentifier: string) => WorkflowPayload;
export declare const replaceAllStringInWorkflowDefinition: (workflowDefinition: string, oldString: string, newString: string) => string;
export {};
