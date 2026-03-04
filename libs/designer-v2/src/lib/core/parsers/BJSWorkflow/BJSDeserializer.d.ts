import type { Workflow } from '../../../common/models/workflow';
import type { OutputMock } from '../../state/unitTest/unitTestInterfaces';
import { type Operations, type NodesMetadata } from '../../state/workflow/workflowInterfaces';
import type { WorkflowNode, WorkflowEdge } from '../models/workflowNode';
import type { Assertion, LogicAppsV2, UnitTestDefinition } from '@microsoft/logic-apps-shared';
import type { PasteScopeParams } from '../../actions/bjsworkflow/copypaste';
export type DeserializedWorkflow = {
    graph: WorkflowNode;
    actionData: Operations;
    nodesMetadata: NodesMetadata;
    staticResults?: Record<string, any>;
};
export declare const Deserialize: (definition: LogicAppsV2.WorkflowDefinition, runInstance: LogicAppsV2.RunInstanceDefinition | null, shouldAppendAddCase?: boolean, workflowKind?: string | undefined) => DeserializedWorkflow;
/**
 * Deserializes a unit test definition and a workflow definition into assertions and mock results.
 * @param {UnitTestDefinition | null} unitTestDefinition - The unit test definition to deserialize.
 * @param {Workflow} workflowDefinition - The workflow definition to deserialize.
 * @returns An object containing the assertions and mock results, or null if the unit test definition is null.
 */
export declare const deserializeUnitTestDefinition: (unitTestDefinition: UnitTestDefinition | null, workflowDefinition: Workflow) => {
    assertions: Assertion[];
    mockResults: Record<string, OutputMock>;
} | null;
export declare const buildGraphFromActions: (actions: Record<string, LogicAppsV2.ActionDefinition>, graphId: string, parentNodeId: string | undefined, allActionNames: string[], shouldAppendAddCase: boolean, pasteScopeParams?: PasteScopeParams) => [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata];
export declare const processScopeActions: (rootGraphId: string, actionName: string, action: LogicAppsV2.ScopeAction, allActionNames: string[], shouldAppendAddCase: boolean, pasteScopeParams?: PasteScopeParams) => [WorkflowNode[], WorkflowEdge[], Operations, NodesMetadata];
export declare const getAllActionNames: (actions: LogicAppsV2.Actions | undefined, names?: string[], includeCase?: boolean) => string[];
