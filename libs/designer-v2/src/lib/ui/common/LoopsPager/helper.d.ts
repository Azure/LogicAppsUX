import type { NodeOperation } from '../../../core/state/operation/operationMetadataSlice';
import type { NodesMetadata } from '../../../core/state/workflow/workflowInterfaces';
import { type LogicAppsV2 } from '@microsoft/logic-apps-shared';
/**
 * Gets number of loops for loop nodes.
 * @param {LogicAppsV2.WorkflowRunAction} action - Node run metadata.
 * @returns {number | undefined} Number of loops if metadata has the property otherwise undefined.
 */
export declare const getLoopsCount: (action: LogicAppsV2.WorkflowRunAction) => number | undefined;
/**
 * Gets repetition name for API call.
 * @param {number | undefined} index - Node's parent loop index.
 * @param {string} id - Node id.
 * @param {NodesMetadata} nodesMetadata - Node run metadata.
 * @returns {string} Repetition name.
 */
export declare const getRepetitionName: (index: number | undefined, id: string, nodesMetadata: NodesMetadata, operationInfo: Record<string, NodeOperation>) => string;
/**
 * Gets repetition name for API call.
 * @param {number | undefined} index - Node's parent loop index.
 * @returns {string} Repetition name.
 */
export declare const getScopeRepetitionName: (index: number | undefined) => string;
