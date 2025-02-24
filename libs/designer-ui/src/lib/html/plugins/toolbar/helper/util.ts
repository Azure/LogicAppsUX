import { encodeStringSegmentTokensInDomContext } from '../../../../editor/base/utils/parsesegments';
import type { ValueSegment } from '@microsoft/logic-apps-shared';
import DomPurify from 'dompurify';

const encodeReduceFunction = (acc: Record<string, string>, key: string) => {
  acc[key] = encodeURIComponent(key);
  return acc;
};
const decodeReduceFunction = (acc: Record<string, string>, key: string) => {
  acc[encodeURIComponent(key)] = key;
  return acc;
};
const htmlUnsafeCharacters = ['<', '>'];
const htmlUnsafeCharacterEncodingMap: Record<string, string> = htmlUnsafeCharacters.reduce(encodeReduceFunction, {});
const htmlUnsafeCharacterDecodingMap: Record<string, string> = htmlUnsafeCharacters.reduce(decodeReduceFunction, {});

const lexicalUnsafeCharacters = ['&', '"'];
const lexicalUnsafeCharacterEncodingMap: Record<string, string> = lexicalUnsafeCharacters.reduce(encodeReduceFunction, {});
const lexicalUnsafeCharacterDecodingMap: Record<string, string> = lexicalUnsafeCharacters.reduce(decodeReduceFunction, {});

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
const htmlEditorSupportedAttributes: { '*': string[] } & Record<string, string[]> = {
  '*': ['class', 'id', 'style'],
  a: ['href'],
  img: ['alt', 'src'],
  table: ['border', 'cellpadding', 'cellspacing'],
};

export interface Position {
  x: number;
  y: number;
}

export const cleanHtmlString = (html: string): string => {
  let cleanedHtmlString = html;

  // if html string is empty (when editor is empty: <p class="editor-paragraph"><br></p>), no need to clean html
  const emptyParagraphPattern = /^(\s*<p[^>]*>\s*<br>\s*<\/p>\s*)+$/;
  if (emptyParagraphPattern.test(cleanedHtmlString)) {
    return cleanedHtmlString;
  }

  // Ensure that all newlines are treated as HTML line breaks when it is safe to convert to lexical
  const nodeMap = new Map<string, ValueSegment>();
  const isSafeForLexical = isHtmlStringValueSafeForLexical(cleanedHtmlString, nodeMap);
  if (isSafeForLexical) {
    cleanedHtmlString = cleanedHtmlString.replace(/\n/g, '<br>');
  }

  // Remove extraneous <span> tags.
  cleanedHtmlString = cleanedHtmlString.replace(/<span>(.*?)<\/span>/g, '$1');

  // Remove wrapper tags around <br> elements.
  // (Remove this when issue is fixed: https://github.com/facebook/lexical/issues/3879#issuecomment-1640215777)
  cleanedHtmlString = cleanedHtmlString.replace(/<(p|h[1-4])>((<br>)+)<\/\1>/g, (_match, _tag, brs) => brs);

  // Move <br> at the end of <p> outside of the block.
  cleanedHtmlString = cleanedHtmlString.replace(/<p([^>]*)>(.*?)<\/p>/g, (_match, attributes, content) => {
    const trimmedContent = content.trim();
    if (trimmedContent === '<br>') {
      // If <p> contains only <br>, remove the <p> and just return the <br> to avoid extra linebreaks
      return '<br>';
    }

    if (trimmedContent.endsWith('<br>')) {
      // Remove the <br> from the end
      const contentWithoutBr = trimmedContent.slice(0, -4).trim();
      // If the <p> becomes empty, return just the <br>
      if (contentWithoutBr === '') {
        return '<br>';
      }
      // Move <br> outside the <p>
      return `<p${attributes}>${contentWithoutBr}</p><br>`;
    }

    // Return the original <p> content if no <br> handling is needed
    return `<p${attributes}>${trimmedContent}</p>`;
  });

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
  // Comments at the start of a DOM are lost when parsing HTML strings, so we wrap the HTML string in a <div>.
  const wrappedHtmlEditorString = `<div>${htmlEditorString}</div>`;

  const purifiedHtmlEditorString = DomPurify.sanitize(wrappedHtmlEditorString, { ADD_TAGS: ['#comment'] });
  const encodedHtmlEditorString = encodeStringSegmentTokensInDomContext(purifiedHtmlEditorString, nodeMap);

  const tempElement = document.createElement('div');
  tempElement.innerHTML = DomPurify.sanitize(encodedHtmlEditorString);

  // Unwrap the wrapper <div>.
  return tempElement.firstElementChild as HTMLElement;
};

export const isAttributeSupportedByHtmlEditor = (tagName: string, attribute: string): boolean => {
  if (tagName.length === 0 || attribute.length === 0) {
    return false;
  }

  const tagNameLower = tagName.toLowerCase();
  const attributeLower = attribute.toLowerCase();

  if (htmlEditorSupportedAttributes[tagNameLower]?.includes(attributeLower)) {
    return true;
  }

  return htmlEditorSupportedAttributes['*'].includes(attributeLower);
};

export const isHtmlStringValueSafeForLexical = (htmlEditorString: string, nodeMap: Map<string, ValueSegment>): boolean => {
  const tempElement = getDomFromHtmlEditorString(htmlEditorString, nodeMap);

  const elements = tempElement.querySelectorAll('*');
  // biome-ignore lint/style/useForOf:Node List is not iterable
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (!isTagNameSupportedByLexical(element.tagName)) {
      return false;
    }

    // Styling inside <p> tags is not supported by the lexical editor.
    if (element.tagName.toLowerCase() === 'p' && element.hasAttribute('style')) {
      return false;
    }

    const attributes = Array.from(element.attributes);
    for (const attribute of attributes) {
      if (!isAttributeSupportedByHtmlEditor(element.tagName, attribute.name)) {
        return false;
      }
    }
  }

  return true;
};

export const isTagNameSupportedByLexical = (tagName: string): boolean =>
  tagName.length > 0 && lexicalSupportedTagNames.has(tagName.toLowerCase());

export const dropDownActiveClass = (active: boolean) => {
  if (active) {
    return 'active msla-dropdown-item-active';
  }
  return '';
};
