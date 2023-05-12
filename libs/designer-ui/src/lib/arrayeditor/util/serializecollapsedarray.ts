import type { ArrayItemSchema, ComplexArrayItems, SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import type { CastHandler } from '../../editor/base';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { convertComplexItemsToArray, validationAndSerializeComplexArray, validationAndSerializeSimpleArray } from './util';
import { guid } from '@microsoft/utils-logic-apps';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

export const serializeSimpleArray = (
  editor: LexicalEditor,
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    validationAndSerializeSimpleArray(editorString, nodeMap, setItems, setIsValid);
  });
};

export const serializeComplexArray = (
  editor: LexicalEditor,
  itemSchema: ArrayItemSchema,
  setItems: (items: ComplexArrayItems[]) => void,
  setIsValid: (b: boolean) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    validationAndSerializeComplexArray(editorString, nodeMap, itemSchema, setItems, setIsValid, undefined);
  });
};

export const parseSimpleItems = (items: SimpleArrayItem[]): ValueSegment[] => {
  if (items.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  "' });
  items.forEach((item, index) => {
    const { value } = item;
    value?.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n]' });
  });
  return parsedItems;
};

export const parseComplexItems = (
  allItems: ComplexArrayItems[],
  itemSchema: ArrayItemSchema,
  castParameter: CastHandler
): { castedValue: ValueSegment[]; uncastedValue: ValueSegment[] } => {
  const emptyValue = [{ id: guid(), type: ValueSegmentType.LITERAL, value: '[]' }];
  if (allItems.length === 0) {
    return { castedValue: emptyValue, uncastedValue: emptyValue };
  }
  const castedArrayVal: any = [];
  const uncastedArrayVal: any = [];
  const nodeMap = new Map<string, ValueSegment>();
  allItems.forEach((currItem) => {
    const { items } = currItem;
    castedArrayVal.push(convertComplexItemsToArray(itemSchema, items, nodeMap, /*suppress casting*/ false, castParameter));
    uncastedArrayVal.push(convertComplexItemsToArray(itemSchema, items, nodeMap, /*suppress casting*/ true, castParameter));
  });
  return {
    castedValue: convertStringToSegments(JSON.stringify(castedArrayVal, null, 4), true, nodeMap),
    uncastedValue: convertStringToSegments(JSON.stringify(uncastedArrayVal, null, 4), true, nodeMap),
  };
};
