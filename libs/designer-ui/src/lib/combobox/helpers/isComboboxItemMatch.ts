import type { ComboboxItem } from '..';

export const isComboboxItemMatch = (item: ComboboxItem, searchValue: string) =>
  item.displayName.toLowerCase().includes(searchValue.replace(/\\/g, '').toLowerCase());
