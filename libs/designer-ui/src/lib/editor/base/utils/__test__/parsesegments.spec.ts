import { encodeStringSegments } from '../parsesegments';

describe('lib/editor/base/utils/parseSegments', () => {
  describe('encodeStringSegments', () => {
    it.each([
      ['plain text', 'plain text'],
      [`$[concat(...),concat('&lt;'),#AD008C]$`, `$[concat(...),concat('%26lt;'),#AD008C]$`],
      [`text$[concat(...),concat('&lt;'),#AD008C]$text`, `text$[concat(...),concat('%26lt;'),#AD008C]$text`],
      [`$[replace(...),replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"') ,#AD008C]$`, `$[replace(...),replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','"') ,#AD008C]$`]
    ])('should properly encode segments in: %p', (input, expected) => {
      expect(encodeStringSegments(input, true)).toBe(expected);
    });
  });
});
