import { describe, it, expect, vi } from 'vitest';
import { getIconPath, getThemedIconPath } from '../assets';
import path from 'path';
import { assetsFolderName } from '../../../../constants';

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      asAbsolutePath: vi.fn((relativePath: string) => `mocked/path/${relativePath}`),
    },
  },
}));

describe('assets utility functions', () => {
  describe('getIconPath', () => {
    it('should return the correct icon path', () => {
      const iconName = 'testIcon';
      const expectedPath = path.join('mocked', 'path', assetsFolderName, 'testIcon.svg');
      const result = getIconPath(iconName);
      expect(result).toBe(expectedPath);
    });
  });

  describe('getThemedIconPath', () => {
    it('should return the correct themed icon path', () => {
      const iconName = 'testIcon';
      const expectedPath = {
        light: path.join('mocked', 'path', assetsFolderName, 'light', 'testIcon.svg'),
        dark: path.join('mocked', 'path', assetsFolderName, 'dark', 'testIcon.svg'),
      };
      const result = getThemedIconPath(iconName);
      expect(result).toEqual(expectedPath);
    });
  });
});
