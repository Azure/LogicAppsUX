import { guid, customLengthGuid, isAGuid, guidLength } from '../guid';
import { describe, it, expect } from 'vitest';

describe('lib/helpers/guid', () => {
  describe('guid()', () => {
    it('should generate the guid in proper format', () => {
      expect(guid()).toEqual(expect.stringMatching(/[a-z|\d]{8}-[a-z|\d]{4}-[a-z|\d]{4}-[a-z|\d]{4}-[a-z|\d]{12}/i));
    });

    it('should generate guid with correct length', () => {
      expect(guid()).toHaveLength(36);
    });

    it('should generate unique guids on multiple calls', () => {
      const guid1 = guid();
      const guid2 = guid();
      const guid3 = guid();

      expect(guid1).not.toBe(guid2);
      expect(guid1).not.toBe(guid3);
      expect(guid2).not.toBe(guid3);
    });

    it('should use uppercase hex characters', () => {
      const generatedGuid = guid();
      expect(generatedGuid).toMatch(/^[0-9A-F-]+$/);
    });
  });

  describe('customLengthGuid()', () => {
    it('should generate guid with specified length', () => {
      expect(customLengthGuid(10)).toHaveLength(10);
      expect(customLengthGuid(32)).toHaveLength(32);
      expect(customLengthGuid(5)).toHaveLength(5);
    });

    it('should return empty string for zero length', () => {
      expect(customLengthGuid(0)).toBe('');
    });

    it('should return empty string for negative length', () => {
      expect(customLengthGuid(-1)).toBe('');
      expect(customLengthGuid(-10)).toBe('');
    });

    it('should generate hexadecimal characters only', () => {
      const result = customLengthGuid(20);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different results on multiple calls', () => {
      const result1 = customLengthGuid(16);
      const result2 = customLengthGuid(16);
      expect(result1).not.toBe(result2);
    });

    it('should handle large lengths', () => {
      const result = customLengthGuid(100);
      expect(result).toHaveLength(100);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('should not contain dashes', () => {
      const result = customLengthGuid(32);
      expect(result).not.toContain('-');
    });
  });

  describe('isAGuid()', () => {
    it('should return true for valid GUIDs', () => {
      expect(isAGuid('12345678-1234-4567-8901-123456789012')).toBe(true);
      expect(isAGuid('ABCDEF12-ABCD-4567-89AB-123456789ABC')).toBe(true);
      expect(isAGuid('00000000-0000-4000-8000-000000000000')).toBe(true);
      expect(isAGuid('ffffffff-ffff-4fff-8fff-ffffffffffff')).toBe(true);
    });

    it('should return true for GUIDs with curly braces', () => {
      expect(isAGuid('{12345678-1234-4567-8901-123456789012}')).toBe(true);
      expect(isAGuid('{ABCDEF12-ABCD-4567-89AB-123456789ABC}')).toBe(true);
    });

    it('should return true for mixed case GUIDs', () => {
      expect(isAGuid('AbCdEf12-aBcD-4eFa-8bcD-123456789AbC')).toBe(true);
    });

    it('should return false for invalid GUID formats', () => {
      expect(isAGuid('')).toBe(false);
      expect(isAGuid('not-a-guid')).toBe(false);
      expect(isAGuid('12345678-1234-4567-8901')).toBe(false);
      expect(isAGuid('12345678-1234-4567-8901-123456789012-extra')).toBe(false);
      expect(isAGuid('12345678_1234_4567_8901_123456789012')).toBe(false);
      expect(isAGuid('123456781234456789011234567890123')).toBe(false);
    });

    it('should return false for GUIDs with wrong segment lengths', () => {
      expect(isAGuid('1234567-1234-4567-8901-123456789012')).toBe(false);
      expect(isAGuid('12345678-123-4567-8901-123456789012')).toBe(false);
      expect(isAGuid('12345678-1234-456-8901-123456789012')).toBe(false);
      expect(isAGuid('12345678-1234-4567-890-123456789012')).toBe(false);
      expect(isAGuid('12345678-1234-4567-8901-12345678901')).toBe(false);
    });

    it('should return false for GUIDs with invalid characters', () => {
      expect(isAGuid('12345678-1234-4567-8901-12345678901G')).toBe(false);
      expect(isAGuid('12345678-1234-4567-8901-12345678901!')).toBe(false);
      expect(isAGuid('12345678-1234-4567-8901-12345678901 ')).toBe(false);
      expect(isAGuid('ABCDEFGH-ABCD-4567-8901-123456789012')).toBe(false);
    });

    it('should handle null or undefined gracefully (throws error)', () => {
      expect(() => isAGuid(null as any)).toThrow();
      expect(() => isAGuid(undefined as any)).toThrow();
    });
  });
});
