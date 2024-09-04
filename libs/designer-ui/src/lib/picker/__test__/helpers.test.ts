/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { filterAndSortItems, getTreeItemDisplayName, getTreeItemId } from '../helpers';
import { PickerItemType } from '../types';
import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';

type TreeDynamicValueWithExtraFields = TreeDynamicValue & Record<string, unknown>;

describe('lib/picker/helpers', () => {
  const getMockItemWithoutUsefulData = (): TreeDynamicValueWithExtraFields => ({
    displayName: '',
    isParent: false,
    value: {},
  });

  const getMockLogicAppsItem = (): TreeDynamicValueWithExtraFields => ({
    value: {
      Id: '%252f_cts%252fWorkflow%2bHistory',
      Name: 'Workflow History Folder',
      DisplayName: 'Workflow History',
      Path: '/_cts/Workflow History',
      LastModified: '0001-01-01T00:00:00',
      Size: 0,
      MediaType: null,
      IsFolder: true,
      ETag: null,
      FileLocator: null,
      LastModifiedBy: null,
    },

    // Below top-level fields are normally generated from top-level `value` field as part of `getLegacyDynamicTreeItems`.
    displayName: 'Workflow His...',
    isParent: true,
  });

  const getMockPowerAutomateItem = (): TreeDynamicValueWithExtraFields => ({
    displayName: 'Deep Folder Test 2',
    fullyQualifiedDisplayName: '/Code & Config/Deep Folder Test 1/Deep Folder Test 2',
    isParent: true,
    nodeType: 'Parent',
    selectionState: {
      id: 'b!0000000000000-0000000000000000000000000000_000000000000000000000.0000000000000000000000000000000000',
    },
    selectedItemProperties: {
      id: 'b!0000000000000-0000000000000000000000000000_000000000000000000000.0000000000000000000000000000000000',
    },
    value: 'b!0000000000000-0000000000000000000000000000_000000000000000000000.0000000000000000000000000000000000',
  });

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

  describe('getTreeItemDisplayName', () => {
    it.each<[string, TreeDynamicValue & Record<Exclude<string, keyof TreeDynamicValue>, unknown>]>([
      ['', getMockItemWithoutUsefulData()],
      ['Workflow History', { ...getMockLogicAppsItem(), displayName: '' }],
      ['Workflow His...', getMockLogicAppsItem()],
      ['/Code & Config/Deep Folder Test 1/Deep Folder Test 2', { ...getMockPowerAutomateItem(), displayName: '' }],
      ['Deep Folder Test 2', getMockPowerAutomateItem()],
    ])('should extract the display name %s', (expected, itemAsObject) => {
      expect(getTreeItemDisplayName(itemAsObject)).toEqual(expected);
    });
  });

  describe('getTreeItemId', () => {
    it.each<[string, TreeDynamicValue & Record<Exclude<string, keyof TreeDynamicValue>, unknown>]>([
      ['', getMockItemWithoutUsefulData()],
      ['%252f_cts%252fWorkflow%2bHistory', getMockLogicAppsItem()],
      ['b!0000000000000-0000000000000000000000000000_000000000000000000000.0000000000000000000000000000000000', getMockPowerAutomateItem()],
    ])('should extract the ID %s', (expected, itemAsObject) => {
      expect(getTreeItemId(itemAsObject)).toEqual(expected);
    });
  });
});
