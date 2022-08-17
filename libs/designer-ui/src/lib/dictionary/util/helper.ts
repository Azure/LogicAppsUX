import type { DictionaryEditorItemProps, ValueSegment } from '../..';

export const isEmpty = (item: DictionaryEditorItemProps) => {
  return isEmptyValue(item.key) && isEmptyValue(item.value);
};

const isEmptyValue = (segments: ValueSegment[]): boolean => {
  return !segments.length || (segments.length === 1 && segments[0].value === '');
};
