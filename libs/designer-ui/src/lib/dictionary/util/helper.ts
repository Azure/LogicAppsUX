import type { DictionaryEditorItemProps } from '..';

export const isEmpty = (item: DictionaryEditorItemProps) => {
  return item.key.length === 0 && item.value.length === 0;
};
