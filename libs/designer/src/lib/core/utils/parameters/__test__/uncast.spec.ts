import { describe, expect, it } from 'vitest';
import { UncastingUtility } from '../uncast';
import constants from '../../../../common/constants';

describe('core/utils/parameters/uncast', () => {
  describe('isCastableFormat', () => {
    it('should return true for "binary"', () => {
      expect(UncastingUtility.isCastableFormat(constants.SWAGGER.FORMAT.BINARY)).toBe(true);
    });

    it('should return true for "BYTE" (case-insensitive)', () => {
      expect(UncastingUtility.isCastableFormat(constants.SWAGGER.FORMAT.BYTE.toUpperCase())).toBe(true);
    });

    it('should return true for "datauri"', () => {
      expect(UncastingUtility.isCastableFormat(constants.SWAGGER.FORMAT.DATAURI)).toBe(true);
    });

    it('should return false for uncastable format like "uuid"', () => {
      expect(UncastingUtility.isCastableFormat(constants.SWAGGER.FORMAT.UUID)).toBe(false);
    });

    it('should return false for undefined format', () => {
      expect(UncastingUtility.isCastableFormat(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(UncastingUtility.isCastableFormat('')).toBe(false);
    });
  });
});
