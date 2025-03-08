import type { TreeDynamicValue } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import { PickerItemType } from './types';

export const filterAndSortItems = (
  items: TreeDynamicValue[] | undefined,
  type: PickerItemType,
  mediaTypeFilters: string[] | undefined
): TreeDynamicValue[] => {
  if (!items || items.length === 0) {
    return [];
  }
  let returnItems = items;
  if (type === PickerItemType.FOLDER) {
    returnItems = items.filter((item) => item.isParent);
  }
  if (mediaTypeFilters && mediaTypeFilters.length > 0) {
    returnItems = returnItems.filter((item) => {
      return mediaTypeFilters.some((mediaTypeFilter) => equals(mediaTypeFilter, item.mediaType) || item.isParent);
    });
  }
  return Array.from(returnItems).sort((a, b) => {
    if (a.isParent && !b.isParent) {
      return -1;
    }
    if (!a.isParent && b.isParent) {
      return 1;
    }
    return a.displayName.localeCompare(b.displayName);
  });
};
