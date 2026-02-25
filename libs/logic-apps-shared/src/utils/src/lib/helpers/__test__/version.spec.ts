import { describe, it, expect } from 'vitest';
import { isVersionSupported } from '../version';

describe('version helpers', () => {
  describe('isVersionSupported', () => {
    describe('basic version comparison (>= by default)', () => {
      it('should return true when current version is greater than required', () => {
        expect(isVersionSupported('2.0.0', '1.0.0')).toBe(true);
        expect(isVersionSupported('1.1.0', '1.0.0')).toBe(true);
        expect(isVersionSupported('1.0.1', '1.0.0')).toBe(true);
        expect(isVersionSupported('1.115.0', '1.114.22')).toBe(true);
        expect(isVersionSupported('2.114.21', '1.114.22')).toBe(true);
      });

      it('should return true when current version equals required version', () => {
        expect(isVersionSupported('1.0.0', '1.0.0')).toBe(true);
        expect(isVersionSupported('1.114.22', '1.114.22')).toBe(true);
        expect(isVersionSupported('0.0.0', '0.0.0')).toBe(true);
      });

      it('should return false when current version is less than required', () => {
        expect(isVersionSupported('1.0.0', '2.0.0')).toBe(false);
        expect(isVersionSupported('1.0.0', '1.1.0')).toBe(false);
        expect(isVersionSupported('1.0.0', '1.0.1')).toBe(false);
        expect(isVersionSupported('1.114.21', '1.114.22')).toBe(false);
        expect(isVersionSupported('1.113.99', '1.114.0')).toBe(false);
      });
    });

    describe('exact match mode', () => {
      it('should return true only when versions match exactly', () => {
        expect(isVersionSupported('1.0.0', '1.0.0', true)).toBe(true);
        expect(isVersionSupported('1.114.22', '1.114.22', true)).toBe(true);
      });

      it('should return false when versions do not match exactly', () => {
        expect(isVersionSupported('1.0.1', '1.0.0', true)).toBe(false);
        expect(isVersionSupported('2.0.0', '1.0.0', true)).toBe(false);
        expect(isVersionSupported('1.1.0', '1.0.0', true)).toBe(false);
        expect(isVersionSupported('1.114.23', '1.114.22', true)).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid current version format', () => {
        expect(() => isVersionSupported('invalid', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.x.3', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('a.b.c', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1', '1.0.0')).toThrow('Invalid version format');
      });

      it('should throw error for invalid required version format', () => {
        expect(() => isVersionSupported('1.0.0', 'invalid')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '1.x.3')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', 'a.b.c')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '1.0')).toThrow('Invalid version format');
      });

      it('should throw error for negative version numbers', () => {
        expect(() => isVersionSupported('1.0.-1', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('-1.0.0', '1.0.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '1.-1.0')).toThrow('Invalid version format');
      });
    });

    describe('edge cases', () => {
      it('should handle version 0.0.0', () => {
        expect(isVersionSupported('0.0.0', '0.0.0')).toBe(true);
        expect(isVersionSupported('0.0.1', '0.0.0')).toBe(true);
        expect(isVersionSupported('0.0.0', '0.0.1')).toBe(false);
      });

      it('should handle large version numbers', () => {
        expect(isVersionSupported('999.999.999', '1.0.0')).toBe(true);
        expect(isVersionSupported('1.0.0', '999.999.999')).toBe(false);
      });

      it('should handle 4-part versions by ignoring the 4th part', () => {
        expect(isVersionSupported('1.160.0.18', '1.160.0.0')).toBe(true); // 4th part ignored, compares as 1.160.1 vs 1.160.1
        expect(isVersionSupported('1.160.0.18', '1.160.0')).toBe(true); // 1.160.1 > 1.160.0
        expect(isVersionSupported('1.160.0.99', '1.160.1')).toBe(false); // 1.160.0 < 1.160.1
        expect(isVersionSupported('2.0.0.1', '1.114.22')).toBe(true); // 2.0.0 > 1.114.22
      });

      it('should handle versions with >3 parts by ignoring extra parts', () => {
        expect(isVersionSupported('2.0.1.0', '2.0.1')).toBe(true);
        expect(isVersionSupported('1.0.0.2', '2.0.1')).toBe(false);
      });
    });
  });
});
