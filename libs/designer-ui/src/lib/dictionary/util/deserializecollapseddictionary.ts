import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { isEmpty } from './helper';
import { guid } from '@microsoft-logic-apps/utils';

export const convertItemsToSegments = (items: DictionaryEditorItemProps[]): ValueSegment[] => {
  const itemsToConvert = items.filter((item) => {
    return !isEmpty(item);
  });

  if (itemsToConvert.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '{\n  "' });

  for (let index = 0; index < itemsToConvert.length; index++) {
    const { key, value } = itemsToConvert[index];
    parsedItems.push(...key);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '" : "' });
    parsedItems.push(...value);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < itemsToConvert.length - 1 ? '",\n  "' : '"\n}' });
  }

  return parsedItems;
};
