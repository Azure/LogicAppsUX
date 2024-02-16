import type { ContentLink, SecureData } from '@microsoft/utils-logic-apps';

export interface RequestHistory {
  properties: RequestHistoryProperties;
}

export interface RequestHistoryRequest {
  body?: any;
  bodyLink?: ContentLink;
  headers: Record<string, string>;
  method: string;
  uri: string;
}

export interface RequestHistoryResponse {
  body?: any;
  bodyLink?: ContentLink;
  headers: Record<string, string>;
  statusCode: number;
}

interface ExtendedErrorInfo {
  code: string;
  details?: ExtendedErrorInfo[];
  innerError?: any;
  message: string;
}

interface RequestHistoryProperties {
  endTime?: string;
  error?: ExtendedErrorInfo;
  request?: RequestHistoryRequest;
  response?: RequestHistoryResponse;
  startTime: string;
  secureData?: SecureData;
}
