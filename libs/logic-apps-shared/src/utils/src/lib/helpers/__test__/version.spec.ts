import { describe, it, expect } from 'vitest';
import { isMultiVariableSupport, isVersionSupported } from '../version';

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
        expect(() => isVersionSupported('', '1.0.0')).toThrow('Version must be a non-empty string');
      });

      it('should throw error for invalid required version format', () => {
        expect(() => isVersionSupported('1.0.0', 'invalid')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '1.x.3')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', 'a.b.c')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '1.0')).toThrow('Invalid version format');
        expect(() => isVersionSupported('1.0.0', '')).toThrow('Version must be a non-empty string');
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
    });
  });

  describe('isMultiVariableSupport (deprecated)', () => {
    it('should return false for undefined version', () => {
      expect(isMultiVariableSupport(undefined)).toBe(false);
    });

    it('should return false for invalid version format', () => {
      expect(isMultiVariableSupport('invalid')).toBe(false);
      expect(isMultiVariableSupport('1.x.3')).toBe(false);
      expect(isMultiVariableSupport('a.b.c')).toBe(false);
    });

    it('should return false for versions before or equal to 1.114.22', () => {
      expect(isMultiVariableSupport('1.114.22')).toBe(false);
      expect(isMultiVariableSupport('1.114.21')).toBe(false);
      expect(isMultiVariableSupport('1.113.25')).toBe(false);
      expect(isMultiVariableSupport('1.100.0')).toBe(false);
      expect(isMultiVariableSupport('0.999.999')).toBe(false);
    });

    it('should return true for versions after 1.114.22', () => {
      expect(isMultiVariableSupport('1.114.23')).toBe(true);
      expect(isMultiVariableSupport('1.114.24')).toBe(true);
      expect(isMultiVariableSupport('1.115.0')).toBe(true);
      expect(isMultiVariableSupport('1.200.0')).toBe(true);
      expect(isMultiVariableSupport('2.0.0')).toBe(true);
      expect(isMultiVariableSupport('2.1.1')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(isMultiVariableSupport('')).toBe(false);
      expect(isMultiVariableSupport('1')).toBe(false);
      expect(isMultiVariableSupport('1.114')).toBe(false);
    });
  });
});
