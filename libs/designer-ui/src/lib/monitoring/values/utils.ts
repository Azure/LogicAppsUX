import type { Xml } from './types';
import type { ContentHash, ContentLink, SecureData } from '@microsoft/logic-apps-shared';
import { isObject } from '@microsoft/logic-apps-shared';
import DomPurify from 'dompurify';

const allowedHtmlTags = [
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'p',
  'br',
  'hr',
  'div',
  'span',
  'pre',
  'code',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'del',
  'ins',
  'small',
  'sub',
  'sup',
  'mark',
  'a',
  'img',
  'font',
  'center',
];

const allowedHtmlAttributes = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'target',
  'rel',
  'width',
  'height',
  'colspan',
  'rowspan',
  'align',
  'valign',
  'border',
  'cellpadding',
  'cellspacing',
  'style',
  'dir',
  'lang',
  'color',
  'face',
  'size',
  'bgcolor',
];

/**
 * Sanitizes an HTML-formatted run value before it is injected with dangerouslySetInnerHTML.
 * Strips script/iframe/object tags, inline event handlers (onerror, onload, ...) and
 * javascript: URLs, while preserving the tabular and text formatting markup that
 * HTML-formatted action outputs rely on.
 */
export function sanitizeHtmlValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return DomPurify.sanitize(value, {
    ALLOWED_TAGS: allowedHtmlTags,
    ALLOWED_ATTR: allowedHtmlAttributes,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

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
