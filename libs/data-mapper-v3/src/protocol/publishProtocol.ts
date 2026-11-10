export interface PublishDestination {
  id: string;
  name: string;
  description: string;
  artifactsPath?: string;
}

export interface PublishContext {
  mapName: string;
  projectName: string;
  workspaceName?: string;
  localProjects: PublishDestination[];
}

export type PublishTarget = { kind: 'local' | 'azure'; id: string };
export interface AzurePublishQuery {
  level: 'subscriptions' | 'resourceGroups' | 'logicApps';
  subscriptionId?: string;
  resourceGroup?: string;
}
export type PublishMethod = 'context' | 'azureTarget' | 'azureResources' | 'publish';

export interface PublishResponse {
  type: 'publishResponse';
  id: string;
  result?: unknown;
  error?: string;
}
