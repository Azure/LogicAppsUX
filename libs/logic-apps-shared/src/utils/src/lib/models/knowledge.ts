export interface KnowledgeHub {
  id: string;
  name: string;
  description: string;
  partitionKey: string;
  createdAt: string;
}

export interface KnowledgeHubArtifact {
  id: string;
  name: string;
  description: string;
  knowledgeHubId: string;
  artifactSource: ArtifactType;
  uploadStatus: ArtifactCreationStatus;
  partitionKey: string;
  createdAt: string;
}

export const ArtifactCreationStatus = {
  Initialized: 'Initialized',
  InProgress: 'InProgress',
  Completed: 'Completed',
  Failed: 'Failed',
};
export type ArtifactCreationStatus = (typeof ArtifactCreationStatus)[keyof typeof ArtifactCreationStatus];

export const ArtifactType = {
  FileUpload: 'FileUpload',
  AzureBlob: 'AzureBlob',
};
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export const ContentKind = {
  Auto: 0,
  PDF: 1,
  Word: 2,
  Excel: 3,
};
export type ContentKind = (typeof ContentKind)[keyof typeof ContentKind];

export interface KnowledgeHubExtended extends KnowledgeHub {
  artifacts: KnowledgeHubArtifact[];
}
