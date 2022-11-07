import type { ComplexArrayItems, SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { convertComplexItemtoSchema, flattenObject } from './util';
import { guid } from '@microsoft-logic-apps/utils';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

export const serializeSimpleArray = (editor: LexicalEditor, setItems: (items: SimpleArrayItem[]) => void) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }
    const returnItems: SimpleArrayItem[] = [];

    for (const [, value] of Object.entries(jsonEditor)) {
      returnItems.push({
        value: convertStringToSegments(value as string, true, nodeMap),
        key: guid(),
      });
    }
    setItems(returnItems);
  });
};

export const serializeComplexArray = (editor: LexicalEditor, setItems: (items: ComplexArrayItems[]) => void) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }

    const returnItems: ComplexArrayItems[] = [];
    jsonEditor.forEach((jsonEditorItem: any) => {
      const flatJSON = flattenObject(jsonEditorItem);
      const returnVal = Object.keys(flatJSON).map((key) => {
        return { title: key, value: convertStringToSegments(flatJSON[key], true, nodeMap) };
      });

      returnItems.push({ key: guid(), items: returnVal });
    });
    setItems(returnItems);
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

export const parseComplexItems = (allItems: ComplexArrayItems[], itemSchema: any): ValueSegment[] => {
  if (allItems.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const currItems = allItems.filter((allItem) => {
    let bool = false;
    allItem.items.forEach((item) => {
      if (item.value.length > 0) {
        bool = true;
      }
    });
    return bool;
  });

  const arrayVal: any = [];
  const nodeMap = new Map<string, ValueSegment>();
  currItems.forEach((allItems) => {
    const { items } = allItems;
    arrayVal.push(convertComplexItemtoSchema(itemSchema, items, nodeMap));
  });
  return convertStringToSegments(JSON.stringify(arrayVal, null, 4), true, nodeMap);
};
