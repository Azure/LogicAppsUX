import { encodeStringSegmentTokensInDomContext } from '../../../../editor/base/utils/parsesegments';
import type { ValueSegment } from '@microsoft/logic-apps-shared';

const htmlUnsafeCharacters = ['<', '>'];
const htmlUnsafeCharacterEncodingMap: Record<string, string> = htmlUnsafeCharacters.reduce(
  (acc, key) => ({ ...acc, [key]: encodeURIComponent(key) }),
  {}
);
const htmlUnsafeCharacterDecodingMap: Record<string, string> = htmlUnsafeCharacters.reduce(
  (acc, key) => ({ ...acc, [encodeURIComponent(key)]: key }),
  {}
);

const lexicalUnsafeCharacters = ['&', '"'];
const lexicalUnsafeCharacterEncodingMap: Record<string, string> = lexicalUnsafeCharacters.reduce(
  (acc, key) => ({ ...acc, [key]: encodeURIComponent(key) }),
  {}
);
const lexicalUnsafeCharacterDecodingMap: Record<string, string> = lexicalUnsafeCharacters.reduce(
  (acc, key) => ({ ...acc, [encodeURIComponent(key)]: key }),
  {}
);

const lexicalSupportedTagNames = new Set([
  'a',
  'b',
  'br',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
]);
const lexicalSupportedAttributes: { '*': string[] } & Record<string, string[]> = {
  '*': ['id', 'style'],
  a: ['href'],
};

export interface Position {
  x: number;
  y: number;
}

export const cleanHtmlString = (html: string): string => {
  let cleanedHtmlString = html;

  // Ensure that all newlines are treated as HTML line breaks.
  cleanedHtmlString = cleanedHtmlString.replace(/\n/g, '<br>');

  // Remove extraneous <span> tags.
  cleanedHtmlString = cleanedHtmlString.replace(/<span>(.*?)<\/span>/g, '$1');

  // Remove wrapper tags around <br> elements.
  // (Remove this when issue is fixed: https://github.com/facebook/lexical/issues/3879#issuecomment-1640215777)
  cleanedHtmlString = cleanedHtmlString.replace(/<(p|h[1-4])>((<br>)+)<\/\1>/g, (_match, _tag, brs) => brs);

  // Move <br> at the end of <p> outside of the block.
  cleanedHtmlString = cleanedHtmlString.replace(/((<br>)+)(<\/p>)/g, (_match, brs, _br, tag) => `${tag}${brs}`);

  return cleanedHtmlString;
};

export const cleanStyleAttribute = (styleAttributeValue: string): string | undefined => {
  const newValue = styleAttributeValue.replace('white-space: pre-wrap;', '').trim();
  return newValue.length ? newValue : undefined;
};

export const decodeSegmentValueInDomContext = (value: string): string => encodeOrDecodeSegmentValue(value, htmlUnsafeCharacterDecodingMap);

export const encodeSegmentValueInDomContext = (value: string): string => encodeOrDecodeSegmentValue(value, htmlUnsafeCharacterEncodingMap);

export const decodeSegmentValueInLexicalContext = (value: string): string =>
  encodeOrDecodeSegmentValue(value, lexicalUnsafeCharacterDecodingMap);

export const encodeSegmentValueInLexicalContext = (value: string): string =>
  encodeOrDecodeSegmentValue(value, lexicalUnsafeCharacterEncodingMap);

export const encodeOrDecodeSegmentValue = (value: string, encodingMap: Record<string, string>): string => {
  let newValue = value;
  Object.keys(encodingMap).forEach((key) => {
    newValue = newValue.replaceAll(key, encodingMap[key]);
  });
  return newValue;
};

export const getDomFromHtmlEditorString = (htmlEditorString: string, nodeMap: Map<string, ValueSegment>): HTMLElement => {
  const encodedHtmlEditorString = encodeStringSegmentTokensInDomContext(htmlEditorString, nodeMap);

  const tempElement = document.createElement('div');
  tempElement.innerHTML = encodedHtmlEditorString;

  return tempElement;
};

export const isAttributeSupportedByLexical = (tagName: string, attribute: string): boolean => {
  if (tagName.length === 0 || attribute.length === 0) {
    return false;
  }

  const tagNameLower = tagName.toLowerCase();
  const attributeLower = attribute.toLowerCase();

  if (lexicalSupportedAttributes[tagNameLower]?.includes(attributeLower)) {
    return true;
  }

  return lexicalSupportedAttributes['*'].includes(attributeLower);
};

export const isHtmlStringValueSafeForLexical = (htmlEditorString: string, nodeMap: Map<string, ValueSegment>): boolean => {
  const tempElement = getDomFromHtmlEditorString(htmlEditorString, nodeMap);

  const elements = tempElement.querySelectorAll('*');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!isTagNameSupportedByLexical(element.tagName)) {
      return false;
    }

    const attributes = Array.from(element.attributes);
    for (let j = 0; j < attributes.length; j++) {
      const attribute = attributes[j];
      if (!isAttributeSupportedByLexical(element.tagName, attribute.name)) {
        return false;
      }
    }
  }

  return true;
};

export const isTagNameSupportedByLexical = (tagName: string): boolean =>
  tagName.length > 0 && lexicalSupportedTagNames.has(tagName.toLowerCase());

export const dropDownActiveClass = (active: boolean) => {
  if (active) return 'active msla-dropdown-item-active';
  else return '';
};
