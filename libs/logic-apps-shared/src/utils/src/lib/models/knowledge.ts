export interface KnowledgeHub {
    name: string;
    description: string;
}

export interface KnowledgeHubArtifact {
    name: string;
    description: string;
    type?: ArtifactType;
    contentKind?: ContentKind;
    contentStream?: any;
    creationStatus?: ArtifactCreationStatus;
}

export const ArtifactCreationStatus = {
    Initialized: 'Initialized',
    Processing: 'Processing',
    Completed: 'Completed',
    Failed: 'Failed',
}
export type ArtifactCreationStatus = (typeof ArtifactCreationStatus)[keyof typeof ArtifactCreationStatus];

export const ArtifactType = {
    FileUpload: 'FileUpload',
    AzureBlob: 'AzureBlob',
}
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export const ContentKind = {
    Auto: 0,
    PDF: 1,
    Word: 2,
    Excel: 3,
}
export type ContentKind = (typeof ContentKind)[keyof typeof ContentKind];

export interface KnowledgeHubExtended extends KnowledgeHub {
    artifacts: KnowledgeHubArtifact[];
}

