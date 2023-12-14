import {
  cleanHtmlString,
  cleanStyleAttribute,
  decodeSegmentValueInLexicalContext,
  encodeSegmentValueInLexicalContext,
  isAttributeSupportedByLexical,
  isTagNameSupportedByLexical,
} from '../util';

describe('lib/html/plugins/toolbar/helper/util', () => {
  describe('cleanHtmlString', () => {
    it.each([
      ['<p>text1<span>\n</span>text2</p>', '<p>text1<br>text2</p>'],
      ['<p>text</p>', '<p>text</p>'],
      ['<p>text1</p><p><br></p><p>text2</p>', '<p>text1</p><br><p>text2</p>'],
      ['<p>text1<br></p><p><br></p><p>text2</p>', '<p>text1</p><br><br><p>text2</p>'],
      ['<span>text</span>', 'text'],
      ['<span id="$[abc,variables(\'abc\'),#770bd6]$">text</span>', '<span id="$[abc,variables(\'abc\'),#770bd6]$">text</span>'],
      ['<span id="$[concat(),concat(\'&lt;\'),#ad008c]$">text</span>', '<span id="$[concat(),concat(\'&lt;\'),#ad008c]$">text</span>'],
      ['<span id="$[concat(),concat(\'%26lt;\'),#ad008c]$">text</span>', '<span id="$[concat(),concat(\'%26lt;\'),#ad008c]$">text</span>'],
      ['<span id="@{variables(\'abc\')}">text</span>', '<span id="@{variables(\'abc\')}">text</span>'],
      ['<span id="@{concat(\'&lt;\')}">text</span>', '<span id="@{concat(\'&lt;\')}">text</span>'],
      ['<span id="@{concat(\'%26lt;\')}">text</span>', '<span id="@{concat(\'%26lt;\')}">text</span>'],
    ])('should properly convert HTML: %p', (input, expected) => {
      expect(cleanHtmlString(input)).toBe(expected);
    });
  });

  describe('cleanStyleAttribute', () => {
    it.each<[string, string | undefined]>([
      ['', undefined],
      ['white-space: pre-wrap;', undefined],
      ['color: red; white-space: pre-wrap;', 'color: red;'],
      ['white-space: pre-wrap; color: red;', 'color: red;'],
    ])('should return style=%p as %p', (input, expected) => {
      expect(cleanStyleAttribute(input)).toBe(expected);
    });
  });

  describe('decodeSegmentValueInLexicalContext', () => {
    it.each([
      ['plain text', 'plain text'],
      ['text with %26lt;%26gt;', 'text with &lt;&gt;'],
      ['text with %26noIdeaWhatThisIs;', 'text with &noIdeaWhatThisIs;'],
      ['text with %26#60;%26gt;', 'text with &#60;&gt;'],
      ['text with %26amp;lt;%26amp;gt;', 'text with &amp;lt;&amp;gt;'],
      ['text with %22%26quot;%22', 'text with "&quot;"'],
      ["$[concat(...),concat('abc'),#AD008C]$", "$[concat(...),concat('abc'),#AD008C]$"],
      ["$[concat(...),concat('%26lt;'),#AD008C]$", "$[concat(...),concat('&lt;'),#AD008C]$"],
      ["$[concat(...),concat('%26amp;lt;'),#AD008C]$", "$[concat(...),concat('&amp;lt;'),#AD008C]$"],
      ["@{concat('abc')}", "@{concat('abc')}"],
      ["@{concat('%26lt;')}", "@{concat('&lt;')}"],
      ["@{concat('%26amp;lt;')}", "@{concat('&amp;lt;')}"],
    ])('should properly decode segments in: %p', (input, expected) => {
      expect(decodeSegmentValueInLexicalContext(input)).toBe(expected);
    });
  });

  describe('encodeSegmentValueInLexicalContext', () => {
    it.each([
      ['plain text', 'plain text'],
      ['text with &lt;&gt;', 'text with %26lt;%26gt;'],
      ['text with &noIdeaWhatThisIs;', 'text with %26noIdeaWhatThisIs;'],
      ['text with &#60;&gt;', 'text with %26#60;%26gt;'],
      ['text with &amp;lt;&amp;gt;', 'text with %26amp;lt;%26amp;gt;'],
      ['text with "&quot;"', 'text with %22%26quot;%22'],
      ["$[concat(...),concat('abc'),#AD008C]$", "$[concat(...),concat('abc'),#AD008C]$"],
      ["$[concat(...),concat('&lt;'),#AD008C]$", "$[concat(...),concat('%26lt;'),#AD008C]$"],
      ["$[concat(...),concat('&amp;lt;'),#AD008C]$", "$[concat(...),concat('%26amp;lt;'),#AD008C]$"],
      ["@{concat('abc')}", "@{concat('abc')}"],
      ["@{concat('&lt;')}", "@{concat('%26lt;')}"],
      ["@{concat('&amp;lt;')}", "@{concat('%26amp;lt;')}"],
    ])('should properly encode segments in: %p', (input, expected) => {
      expect(encodeSegmentValueInLexicalContext(input)).toBe(expected);
    });
  });

  describe('isAttributeSupportedByLexical', () => {
    it.each<[string, string, boolean]>([
      ['', 'href', false],
      ['a', '', false],
      ['a', 'href', true],
      ['a', 'id', true],
      ['a', 'style', true],
      ['span', 'href', false],
      ['span', 'id', true],
      ['span', 'style', true],
      ['p', 'href', false],
      ['p', 'id', true],
      ['p', 'style', true],
    ])('should return <%s %s="..." /> as supported=%p', (inputTag, inputAttr, expected) => {
      expect(isAttributeSupportedByLexical(inputTag, inputAttr)).toBe(expected);
    });
  });

  describe('isTagNameSupportedByLexical', () => {
    it.each<[string, boolean]>([
      ['', false],
      ['*', false],
      ['section', false],
      ['script', false],
      ['style', false],
      ['b', true],
      ['br', true],
      ['em', true],
      ['h1', true],
      ['h2', true],
      ['h3', true],
      ['h4', true],
      ['h5', true],
      ['h6', true],
      ['i', true],
      ['li', true],
      ['ol', true],
      ['p', true],
      ['span', true],
      ['strong', true],
      ['ul', true],
    ])('should return <%s /> as supported=%p', (inputTag, expected) => {
      expect(isTagNameSupportedByLexical(inputTag)).toBe(expected);
    });
  });
});
