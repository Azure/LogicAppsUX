import constants from '../../../common/constants';
import type { NodeOperation } from '../../../core/state/operation/operationMetadataSlice';
import type { NodesMetadata } from '../../../core/state/workflow/workflowInterfaces';
import type { RootState } from '../../../core/store';
import { getAllParentsForNode } from '../../../core/utils/graph';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';

export { getLoopsCount } from '../../../core/utils/loopRepetitions';

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
    const parentType = getRecordEntry(operationInfo, parent)?.type?.toLowerCase() ?? '';
    const isLoopScope = [constants.NODE.TYPE.FOREACH, constants.NODE.TYPE.UNTIL, constants.NODE.TYPE.AGENT].includes(parentType);
    if (isLoopScope) {
      const zeroBasedCurrent = getRecordEntry(nodesMetadata, parent)?.runIndex;
      repetitionName = repetitionName ? `${String(zeroBasedCurrent).padStart(6, '0')}-${repetitionName}` : String(index).padStart(6, '0');
    }
  });

  return repetitionName;
};

/**
 * Gets repetition name for API call.
 * @param {number | undefined} index - Node's parent loop index.
 * @returns {string} Repetition name.
 */
export const getScopeRepetitionName = (index: number | undefined): string => {
  return String(index).padStart(6, '0');
};

interface AgentRepetitionIdentityParams {
  runId: string | undefined;
  ownerNodeId: string | undefined;
  repetitionName: string | undefined;
  repetitionIndex: number | undefined;
  parentStatus: string | undefined;
}

/**
 * Builds the authoritative identity used to scope agent monitoring data to a specific selected iteration.
 * If the run identity is unavailable (legacy/synthetic paths), we intentionally skip scoping and keep
 * existing behavior unchanged.
 */
export const getAgentRepetitionIdentity = ({
  runId,
  ownerNodeId,
  repetitionName,
  repetitionIndex,
  parentStatus,
}: AgentRepetitionIdentityParams): string | undefined => {
  if (!runId || !ownerNodeId || repetitionName === undefined || repetitionIndex === undefined) {
    return undefined;
  }
  return [runId, ownerNodeId, repetitionName, String(repetitionIndex), parentStatus ?? ''].join('|');
};

/**
 * Hook that computes the repetition name inside a selector.
 * Returns a string primitive, so useSelector's default === comparison
 * prevents re-renders when the name hasn't actually changed.
 */
export const useRepetitionName = (
  parentRunIndex: number | undefined,
  nodeId: string,
  operationsInfo: Record<string, NodeOperation>
): string => {
  return useSelector((state: RootState) => getRepetitionName(parentRunIndex, nodeId, state.workflow.nodesMetadata, operationsInfo));
};
