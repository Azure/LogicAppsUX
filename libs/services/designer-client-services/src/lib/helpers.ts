import { equals } from '@microsoft/logic-apps-shared';

export function pathCombine(url: string, path: string): string {
  let pathUrl: string;

  if (!url || !path) {
    pathUrl = url || path;
    return pathUrl;
  }

  return `${trimUrl(url)}/${trimUrl(path)}`;
}

export function getClientRequestIdFromHeaders(headers: Headers | Record<string, string>): string {
  if (headers) {
    return headers instanceof Headers ? (headers.get('x-ms-client-request-id') as string) : (headers['x-ms-client-request-id'] as string);
  }

  return '';
}

export function trimUrl(url: string): string {
  let updatedUrl = url;
  if (updatedUrl[0] === '/') {
    updatedUrl = updatedUrl.substring(1, updatedUrl.length);
  }

  if (updatedUrl[updatedUrl.length - 1] === '/') {
    updatedUrl = updatedUrl.substring(0, updatedUrl.length - 1);
  }

  return updatedUrl;
}

// Removes vars and values from path to allow comparison
export function cleanSwaggerOperationPathValue(value: string): string {
  return value.replace(/{.*?}/g, '').replace('@', '').toLowerCase();
}

export function areSwaggerOperationPathsMatching(path1: string, path2: string): boolean {
  return cleanSwaggerOperationPathValue(path1) === cleanSwaggerOperationPathValue(path2);
}

export function isFunctionContainer(kind: any): boolean {
  if (typeof kind !== 'string') return false;

  const kinds = kind.split(',');
  return (
    kinds.some(($kind) => equals($kind, 'functionapp')) && !kinds.some(($kind) => equals($kind, 'botapp') || equals($kind, 'workflowapp'))
  );
}
