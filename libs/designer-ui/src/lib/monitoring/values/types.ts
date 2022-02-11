export interface ContentHash {
  algorithm: string;
  value: string;
}

export interface ContentLink {
  contentHash: ContentHash;
  contentSize: number;
  contentVersion: string;
  metadata?: Record<string, unknown>;
  secureData?: SecureData;
  uri?: string;
}

export interface SecureData {
  properties: string[];
}

export interface ValueProps {
  displayName: string;
  format?: string;
  language?: string;
  value: any;
  visible?: boolean;
}

export interface Xml {
  '$content-type': string;
  $content: string;
}
