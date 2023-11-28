import { cleanHtmlString, decodeSegmentValue, encodeSegmentValue } from '../util';

describe('lib/html/plugins/toolbar/helper/util', () => {
  describe('cleanHtmlString', () => {
    it.each([
      ['<p>text1<span>\n</span>text2</p>', '<p>text1<br>text2</p>'],
      ['<p>text</p>', '<p>text</p>'],
      ['<p>text1</p><p><br></p><p>text2</p>', '<p>text1</p><br><p>text2</p>'],
      ['<p>text1<br></p><p><br></p><p>text2</p>', '<p>text1</p><br><br><p>text2</p>'],
      ['<span>text</span>', 'text'],
      ['<span id="$[abc,variables(\'abc\'),#770bd6]$">text</span>', '<span id="$[abc,variables(\'abc\'),#770bd6]$">text</span>'],
      ['<span id="$[concat(\'&lt;\'),#ad008c]$">text</span>', '<span id="$[concat(\'&lt;\'),#ad008c]$">text</span>'],
      ['<span id="$[concat(\'%26lt;\'),#ad008c]$">text</span>', '<span id="$[concat(\'%26lt;\'),#ad008c]$">text</span>'],
    ])('should properly convert HTML: %p', (input, expected) => {
      expect(cleanHtmlString(input)).toBe(expected);
    });
  });

  describe('decodeSegmentValue', () => {
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
    ])('should properly decode segments in: %p', (input, expected) => {
      expect(decodeSegmentValue(input)).toBe(expected);
    });
  });

  describe('encodeSegmentValue', () => {
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
    ])('should properly encode segments in: %p', (input, expected) => {
      expect(encodeSegmentValue(input)).toBe(expected);
    });
  });
});
