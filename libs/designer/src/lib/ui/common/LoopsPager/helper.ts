import constants from '../../../common/constants';
import type { NodeOperation } from '../../../core/state/operation/operationMetadataSlice';
import type { NodesMetadata } from '../../../core/state/workflow/workflowInterfaces';
import { getAllParentsForNode } from '../../../core/utils/graph';
import { getRecordEntry, type LogicAppsV2 } from '@microsoft/utils-logic-apps';

/**
 * Gets number of loops for loop nodes.
 * @param {LogicAppsV2.WorkflowRunAction} action - Node run metadata.
 * @returns {number | undefined} Number of loops if metadata has the property otherwise undefined.
 */
export const getForeachItemsCount = (action: LogicAppsV2.WorkflowRunAction): number | undefined => {
  const { inputsLink, iterationCount, repetitionCount } = action || {};

  // Until actions have an iterationCount property when using the 2016-10-01 or later API.
  if (typeof iterationCount === 'number') {
    return iterationCount;
  }

  // Foreach actions have a foreachItemsCount property in its inputsLink's metadata object when using the 2016-06-01 or later API.
  if (inputsLink) {
    const { metadata } = inputsLink;
    if (metadata) {
      const { foreachItemsCount } = metadata;
      if (typeof foreachItemsCount === 'number') {
        return foreachItemsCount;
      }
    }
  }

  if (typeof repetitionCount === 'number') {
    return repetitionCount;
  }

  return undefined;
};

/**
 * Gets repetition name for API call.
 * @param {number | undefined} index - Node's parent loop index.
 * @param {string} id - Node id.
 * @param {NodesMetadata} nodesMetadata - Node run metadata.
 * @returns {string} Repetition name.
 */
export const getRepetitionName = (
  index: number | undefined,
  id: string,
  nodesMetadata: NodesMetadata,
  operationInfo: Record<string, NodeOperation>
): string => {
  let repetitionName = '';
  const parentsForNode = getAllParentsForNode(id, nodesMetadata);
  parentsForNode.forEach((parent) => {
    const parentType = getRecordEntry(operationInfo, parent)?.type?.toLowerCase();
    const isLoopScope = parentType ? parentType === constants.NODE.TYPE.FOREACH || parentType === constants.NODE.TYPE.UNTIL : false;
    if (isLoopScope) {
      const zeroBasedCurrent = getRecordEntry(nodesMetadata, parent)?.runIndex;
      repetitionName = repetitionName ? `${String(zeroBasedCurrent).padStart(6, '0')}-${repetitionName}` : String(index).padStart(6, '0');
    }
  });

  return repetitionName;
};
