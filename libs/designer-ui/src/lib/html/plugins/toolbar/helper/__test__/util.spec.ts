import { cleanHtmlString } from "../util";

describe('lib/html/plugins/toolbar/helper/util', () => {
  describe('cleanHtmlString', () => {
    it.each([
      ["<p>text1<span>\n</span>text2</p>", "<p>text1<br>text2</p>"],
      ["<p>text</p>", "<p>text</p>"],
      ["<p>text1</p><p><br></p><p>text2</p>", "<p>text1</p><br><p>text2</p>"],
      ["<p>text1<br></p><p><br></p><p>text2</p>", "<p>text1</p><br><br><p>text2</p>"],
      ["<span>text</span>", "text"],
      [
        "<span id=\"$[abc,variables('abc'),#770bd6]$\">text</span>",
        "<span id=\"$[abc,variables('abc'),#770bd6]$\">text</span>",
      ],
    ])('should properly convert HTML: %p', (input, expected) => {
      expect(cleanHtmlString(input)).toBe(expected);
    });
  });
});
