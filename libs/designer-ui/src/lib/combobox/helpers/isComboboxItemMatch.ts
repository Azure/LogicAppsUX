import type { ComboboxItem } from '..';

export const isComboboxItemMatch = (item: ComboboxItem, searchValue: string) =>
  new RegExp(searchValue.replace(/\\/g, '').toLowerCase()).test(item.displayName.toLowerCase());
