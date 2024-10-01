import { getConnectorCategoryString } from '@microsoft/designer-ui';
import type { NodeOperation } from '../state/operation/operationMetadataSlice';
import type { NodeTokens } from '../state/tokens/tokensSlice';
import type { Workflow } from '../../common/models/workflow';
import type { DocumentationMetadataState, OperationMetadata, SummaryMetadata } from '@microsoft/logic-apps-shared';

export interface DocumentationRequestBody {
  createTime: string;
  queryId: string;
  queryType: 'documentation';
  query: {
    workflow: Workflow;
    operationsData: DocumentationMetadataState;
  };
}

export const formatResponseToMarkdown = (response: string) => {
  const formattedResponse = response.replace(new RegExp(/\n/, 'g'), '  \n');
  console.log(formattedResponse);
  return response;
};

export const downloadDocumentAsFile = (sampleResponseDocument: string) => {
  const mdFileInString = formatResponseToMarkdown(sampleResponseDocument);
  const element = document.createElement('a');
  const file = new Blob([mdFileInString], {
    type: 'text/plain',
  });
  element.href = URL.createObjectURL(file);
  element.download = 'myFile.md';
  document.body.appendChild(element);
  element.click();
};

export const getSampleRequestBody = (
  workflow: Workflow,
  operationInfo: Record<string, NodeOperation>,
  outputTokens: Record<string, NodeTokens>,
  workflowKind?: string
): DocumentationRequestBody => {
  return {
    createTime: '2023-12-14T18:48:50.756Z',
    queryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    queryType: 'documentation',
    query: {
      workflow: {
        kind: workflowKind,
        ...workflow,
      },
      operationsData: getDocumentationMetadata(operationInfo, outputTokens),
    },
  };
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
