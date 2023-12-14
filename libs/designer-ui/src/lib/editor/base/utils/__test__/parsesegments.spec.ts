import type { ValueSegment } from '@microsoft/designer-client-services-logic-apps';
import { encodeStringSegmentTokensInLexicalContext } from '../parsesegments';

describe('lib/editor/base/utils/parseSegments', () => {
  describe('encodeStringSegmentTokensInLexicalContext', () => {
    it.each([
      ['plain text', 'plain text'],
      [`$[concat(...),concat('&lt;'),#AD008C]$`, `$[concat(...),concat('%26lt;'),#AD008C]$`],
      [`text$[concat(...),concat('&lt;'),#AD008C]$text`, `text$[concat(...),concat('%26lt;'),#AD008C]$text`],
      [
        `$[replace(...),replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"'),#AD008C]$`,
        `$[replace(...),replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','%22'),#AD008C]$`,
      ],
    ])('should properly encode segments in: %p', (input, expected) => {
      const nodeMap = new Map<string, ValueSegment>();
      nodeMap.set(`concat('&lt;')`, {} as unknown as ValueSegment);
      nodeMap.set(`replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')`, {} as unknown as ValueSegment);

      expect(encodeStringSegmentTokensInLexicalContext(input, nodeMap)).toBe(expected);
    });
  });
});
