import type { ReactNode } from 'react';

export interface OperationActionData {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  connectorName?: string;
  brandColor?: string;
  iconUri?: string;
  isTrigger: boolean;
  isBuiltIn?: boolean;
  isCustom?: boolean;
  apiId?: string;
  releaseStatus?: string;
  // Optional host-rendered icon slot for operation rows; connectors keep ConnectorAvatar branding.
  icon?: ReactNode;
}

export interface OperationGroupCardData {
  apiId: string;
  connectorName: string;
  description?: string;
  iconUri?: string;
  brandColor?: string;
  isCustom?: boolean;
}
