import { getConnectorCategoryString } from '@microsoft/designer-ui';
import type { NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../state/tokens/tokensSlice';
import type { DocumentationMetadataState, OperationMetadata, SummaryMetadata } from '@microsoft/logic-apps-shared';

export const downloadDocumentAsFile = (sampleResponseDocument: string) => {
  const mdFileInString = _formatResponseToMarkdown(sampleResponseDocument);
  const element = document.createElement('a');
  const file = new Blob([mdFileInString], {
    type: 'text/plain',
  });
  element.href = URL.createObjectURL(file);
  element.download = 'Workflow Documentation.md';
  document.body.appendChild(element);
  element.click();
};

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

const _formatResponseToMarkdown = (response: string): string => {
  return response.replace(new RegExp(/\n/, 'g'), '  \n');
};
