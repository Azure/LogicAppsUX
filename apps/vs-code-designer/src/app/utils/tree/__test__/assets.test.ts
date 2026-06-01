import { beforeEach, describe, it, expect, vi } from 'vitest';
import { getIconPath, getThemedIconPath } from '../assets';
import path from 'path';
import { assetsFolderName } from '../../../../constants';
import { Theme } from '@microsoft/logic-apps-shared';
import { ext } from '../../../../extensionVariables';

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      asAbsolutePath: vi.fn((relativePath: string) => `mocked/path/${relativePath}`),
    },
  },
}));

describe('assets utility functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getIconPath', () => {
    it('should return a Uri-backed icon path and resolve the expected asset location', () => {
      const iconName = 'testIcon';
      const expectedPath = path.join('mocked', 'path', assetsFolderName, 'testIcon.svg');
      const result = getIconPath(iconName);

      expect(result).toEqual(expect.objectContaining({ fsPath: expectedPath }));
      expect(result.toString()).toBe(expectedPath);
      expect(ext.context.asAbsolutePath).toHaveBeenCalledWith(assetsFolderName);
    });

    it('should preserve non-trivial icon names when building the Uri path', () => {
      const iconName = 'list-unordered';
      const expectedPath = path.join('mocked', 'path', assetsFolderName, 'list-unordered.svg');

      const result = getIconPath(iconName);

      expect(result).toEqual(expect.objectContaining({ fsPath: expectedPath }));
    });
  });

  describe('getThemedIconPath', () => {
    it('should return Uri-backed themed icon paths for both light and dark themes', () => {
      const iconName = 'testIcon';
      const expectedPath = {
        light: path.join('mocked', 'path', assetsFolderName, Theme.Light, 'testIcon.svg'),
        dark: path.join('mocked', 'path', assetsFolderName, Theme.Dark, 'testIcon.svg'),
      };
      const result = getThemedIconPath(iconName);
      const themedResult = result as {
        light: { toString: () => string };
        dark: { toString: () => string };
      };

      expect(result).toEqual({
        light: expect.objectContaining({ fsPath: expectedPath.light }),
        dark: expect.objectContaining({ fsPath: expectedPath.dark }),
      });
      expect(themedResult.light.toString()).toBe(expectedPath.light);
      expect(themedResult.dark.toString()).toBe(expectedPath.dark);
      expect(ext.context.asAbsolutePath).toHaveBeenCalledWith(assetsFolderName);
    });
  });
});
