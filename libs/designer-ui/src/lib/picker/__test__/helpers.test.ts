import { filterAndSortItems } from '../helpers';
import { PickerItemType } from '../types';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';

import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('lib/picker/helpers', () => {
  describe('filterAndSortItems', () => {
    it('should handle undefined array', () => {
      expect(filterAndSortItems(undefined, PickerItemType.FILE, [])).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(filterAndSortItems([], PickerItemType.FILE, [])).toEqual([]);
    });

    it('should filter based on `type` parameter', () => {
      const items: TreeDynamicValue[] = [
        { displayName: 'My Folder', isParent: true, value: {} },
        { displayName: 'My File', isParent: false, value: {} },
      ];

      expect(filterAndSortItems(items, PickerItemType.FOLDER, [])).toEqual([items[0]]);
      expect(filterAndSortItems(items, PickerItemType.FILE, [])).toEqual(items);
    });

    it('should filter based on `mediaTypeFilters` parameter', () => {
      const items: TreeDynamicValue[] = [
        { displayName: 'My Folder', mediaType: 'directory', isParent: true, value: {} },
        { displayName: 'My JSON', mediaType: 'application/json', isParent: false, value: {} },
        { displayName: 'My Binary', mediaType: 'application/octet-stream', isParent: false, value: {} },
      ];

      expect(filterAndSortItems(items, PickerItemType.FILE, ['application/json'])).toEqual([items[0], items[1]]);
    });

    it('should sort results', () => {
      const items: TreeDynamicValue[] = [
        { displayName: 'CCC File', isParent: false, value: {} },
        { displayName: 'BBB Folder', isParent: true, value: {} },
        { displayName: 'AAA Folder', isParent: true, value: {} },
        { displayName: 'BBB File', isParent: false, value: {} },
        { displayName: 'AAA File', isParent: false, value: {} },
      ];

      expect(filterAndSortItems(items, PickerItemType.FILE, [])).toEqual([items[2], items[1], items[4], items[3], items[0]]);
    });
  });
});
