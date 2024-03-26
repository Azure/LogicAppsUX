import {
  decodeStringSegmentTokensInDomContext,
  decodeStringSegmentTokensInLexicalContext,
  encodeStringSegmentTokensInDomContext,
  encodeStringSegmentTokensInLexicalContext,
} from '../parsesegments';
import type { ValueSegmentUI } from '@microsoft/logic-apps-shared';

describe('lib/editor/base/utils/parseSegments', () => {
  describe('decodeStringSegmentTokensInDomContext', () => {
    it.each([
      ['plain text', 'plain text'],
      [`text @{concat('%3C')} text`, `text @{concat('<')} text`],
      [`text @{concat('<')} text`, `text @{concat('<')} text`],
    ])('should properly decode DOM-safe in: %p', (input, expected) => {
      const nodeMap = new Map<string, ValueSegmentUI>();
      nodeMap.set(`concat('<')`, {} as unknown as ValueSegmentUI);

      expect(decodeStringSegmentTokensInDomContext(input, nodeMap)).toBe(expected);
    });
  });

  describe('encodeStringSegmentTokensInDomContext', () => {
    it.each([
      ['plain text', 'plain text'],
      [`text @{concat('<')} text`, `text @{concat('%3C')} text`],
      [`text @{concat('%3C')} text`, `text @{concat('%3C')} text`],
    ])('should properly encode segments to be DOM-safe in: %p', (input, expected) => {
      const nodeMap = new Map<string, ValueSegmentUI>();
      nodeMap.set(`concat('<')`, {} as unknown as ValueSegmentUI);

      expect(encodeStringSegmentTokensInDomContext(input, nodeMap)).toBe(expected);
    });
  });

  describe('decodeStringSegmentTokensInLexicalContext', () => {
    it.each([
      ['plain text', 'plain text'],
      [`text @{concat('&lt;')} text`, `text @{concat('&lt;')} text`],
      [`text @{concat('%26lt;')} text`, `text @{concat('&lt;')} text`],
      [
        `@{replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','%22')}`,
        `@{replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')}`,
      ],
      [
        `@{replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')}`,
        `@{replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')}`,
      ],
    ])('should properly decode Lexical-safe segments in: %p', (input, expected) => {
      const nodeMap = new Map<string, ValueSegmentUI>();
      nodeMap.set(`concat('&lt;')`, {} as unknown as ValueSegmentUI);
      nodeMap.set(`replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')`, {} as unknown as ValueSegmentUI);

      expect(decodeStringSegmentTokensInLexicalContext(input, nodeMap)).toBe(expected);
    });
  });

  describe('encodeStringSegmentTokensInLexicalContext', () => {
    it.each([
      ['plain text', 'plain text'],
      [`text @{concat('&lt;')} text`, `text @{concat('%26lt;')} text`],
      [`text @{concat('%26lt;')} text`, `text @{concat('%26lt;')} text`],
      [
        `@{replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')}`,
        `@{replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','%22')}`,
      ],
      [
        `@{replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','%22')}`,
        `@{replace(replace(replace('abc','%26lt;','<'),'%26gt;','>'),'%26quot;','%22')}`,
      ],
    ])('should properly encode segments to be Lexical-safe in: %p', (input, expected) => {
      const nodeMap = new Map<string, ValueSegmentUI>();
      nodeMap.set(`concat('&lt;')`, {} as unknown as ValueSegmentUI);
      nodeMap.set(`replace(replace(replace('abc','&lt;','<'),'&gt;','>'),'&quot;','"')`, {} as unknown as ValueSegmentUI);

      expect(encodeStringSegmentTokensInLexicalContext(input, nodeMap)).toBe(expected);
    });
  });
});
