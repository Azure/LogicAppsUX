import { isObject } from '@microsoft-logic-apps/utils';
import type { ContentHash, ContentLink, SecureData, Xml } from './types';

export function isContentLink(value: any): value is ContentLink {
  return (
    isObject(value) &&
    isContentHash(value.contentHash) &&
    typeof value.contentSize === 'number' &&
    typeof value.contentVersion === 'string' &&
    (value.metadata === undefined || isObject(value.metadata)) &&
    (value.secureData === undefined || isSecureData(value.secureData)) &&
    (value.uri === undefined || typeof value.uri === 'string')
  );
}

export function isXml(value: any): value is Xml {
  return isObject(value) && /^(?:application|text)\/(.*\+)?xml/i.test(value['$content-type']) && typeof value.$content === 'string';
}

function isContentHash(value: any): value is ContentHash {
  return isObject(value) && typeof value.algorithm === 'string' && typeof value.value === 'string';
}

function isSecureData(value: any): value is SecureData {
  return isObject(value) && Array.isArray(value.properties);
}
