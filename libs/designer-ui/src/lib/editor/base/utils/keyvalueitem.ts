import constants from '../../../constants';
import { isEmpty } from '../../../dictionary/util/helper';
import { ValueSegmentType, type ValueSegment } from '../../models/parameter';
import { insertQutationForStringType } from './helper';
import { guid } from '@microsoft/utils-logic-apps';

export interface KeyValueItem {
  id: string;
  key: ValueSegment[];
  value: ValueSegment[];
}

export const convertKeyValueItemToSegments = (items: KeyValueItem[], keyType?: string, valueType?: string): ValueSegment[] => {
  const itemsToConvert = items.filter((item) => {
    return !isEmpty(item);
  });

  if (itemsToConvert.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '{\n  ' });

  for (let index = 0; index < itemsToConvert.length; index++) {
    const { key, value } = itemsToConvert[index];
    // Todo: we should have some way of handle formatting better
    const updatedKey = key.map((segment) => {
      return { ...segment, value: keyType !== constants.SWAGGER.TYPE.STRING ? segment.value : segment.value.replace(/\n/g, '\\n') };
    });
    const updatedValue = value.map((segment) => {
      return { ...segment, value: valueType !== constants.SWAGGER.TYPE.STRING ? segment.value : segment.value.replace(/\n/g, '\\n') };
    });
    insertQutationForStringType(parsedItems, keyType);
    parsedItems.push(...updatedKey);
    insertQutationForStringType(parsedItems, keyType);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: ' : ' });
    insertQutationForStringType(parsedItems, valueType);
    parsedItems.push(...updatedValue);
    insertQutationForStringType(parsedItems, valueType);
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < itemsToConvert.length - 1 ? ',\n  ' : '\n}' });
  }

  return parsedItems;
};
