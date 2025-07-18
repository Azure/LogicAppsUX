import type { Template } from '../../utils/src';
import { equals, getPropertyValue } from '../../utils/src';

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
  if (typeof kind !== 'string') {
    return false;
  }

  const kinds = kind.split(',');
  return (
    kinds.some(($kind) => equals($kind, 'functionapp')) && !kinds.some(($kind) => equals($kind, 'botapp') || equals($kind, 'workflowapp'))
  );
}

export function getTemplateManifestFromResourceManifest(resourceManifest: any): Template.TemplateManifest {
  const manifest: Template.TemplateManifest = { ...resourceManifest };
  manifest.skus = resourceManifest.supportedSkus?.split(',').map((sku: string) => sku.trim().toLowerCase());
  manifest.tags = resourceManifest.keywords;

  if (manifest.details) {
    manifest.details = {
      By: getPropertyValue(manifest.details, 'by'),
      Type: getPropertyValue(manifest.details, 'type'),
      Category: getPropertyValue(manifest.details, 'category'),
      Trigger: getPropertyValue(manifest.details, 'trigger'),
    };
  }

  delete (manifest as any).supportedSkus;
  delete (manifest as any).keywords;

  return manifest;
}

export function unwrapPaginatedResponse(response: any): any {
  if (response && response.__usedNextPage) {
    return response.value;
  }
  return response;
}
