import { getConnectorCategoryString } from '@microsoft/designer-ui';
import type { NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../state/tokens/tokensSlice';

export interface OperationMetadata {
  connectorCategoryString?: string;
  outputTokenIds: string[];
}

export interface SummaryMetadata {
  connectorCountByTypes: {
    [connectorCategory: string]: number;
  };
}

export interface DocumentationMetadataState {
  operationsMetadata: Record<string, OperationMetadata>;
  summary: SummaryMetadata;
}

export const getDocumentationMetadata = (
  operationInfo: Record<string, NodeOperation>,
  outputTokens: Record<string, NodeTokens>
): DocumentationMetadataState => {
  const summary: SummaryMetadata = {
    connectorCountByTypes: {},
  };
  const operationsMetadata = Object.keys(operationInfo).reduce(
    (operationDocMetadata: Record<string, OperationMetadata>, nodeId: string) => {
      const connectorCategoryInString = getConnectorCategoryString(operationInfo[nodeId].connectorId);
      summary.connectorCountByTypes[connectorCategoryInString] = (summary.connectorCountByTypes[connectorCategoryInString] ?? 0) + 1;

      operationDocMetadata[nodeId] = {
        connectorCategoryString: connectorCategoryInString,
        outputTokenIds: outputTokens[nodeId]?.upstreamNodeIds,
      };

      return operationDocMetadata;
    },
    {}
  );

  return {
    operationsMetadata: operationsMetadata,
    summary: summary,
  };
};
