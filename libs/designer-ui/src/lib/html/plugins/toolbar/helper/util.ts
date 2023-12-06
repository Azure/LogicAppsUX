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

export const decodeSegmentValue =
  (value: string, mode: 'lexical' | 'html'): string => encodeOrDecodeSegmentValue(value, mode, 'decode');

export const encodeSegmentValue =
  (value: string, mode: 'lexical' | 'html'): string => encodeOrDecodeSegmentValue(value, mode, 'encode');

const encodeOrDecodeSegmentValue = (value: string, mode: 'lexical' | 'html', direction: 'encode' | 'decode'): string => {
  const map =
    direction === 'encode'
      ? (mode === 'lexical' ? lexicalUnsafeCharacterEncodingMap : htmlUnsafeCharacterEncodingMap)
      : (mode === 'lexical' ? lexicalUnsafeCharacterDecodingMap : htmlUnsafeCharacterDecodingMap);
  let newValue = value;
  Object.keys(map).forEach((key) => {
    newValue = newValue.replaceAll(key, map[key]);
  });
  return newValue;
};

export const dropDownActiveClass = (active: boolean) => {
  if (active) return 'active msla-dropdown-item-active';
  else return '';
};
