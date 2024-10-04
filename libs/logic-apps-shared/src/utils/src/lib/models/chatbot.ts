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
