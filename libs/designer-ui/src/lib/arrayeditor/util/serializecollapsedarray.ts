import type { ComplexArrayItem, SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { guid } from '@microsoft-logic-apps/utils';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

interface jsonItemObject {
  key: string;
  value: string;
}

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

export const serializeComplexArray = (editor: LexicalEditor, setItems: (items: ComplexArrayItem[]) => void) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }
    const returnItems: ComplexArrayItem[] = [];
    for (const [, item] of Object.entries(jsonEditor)) {
      const currItem: ValueSegment[][] = [];
      for (const [, value] of Object.entries(item as jsonItemObject)) {
        currItem.push(convertStringToSegments(value as string, true, nodeMap));
      }
      returnItems.push({
        value: currItem,
        key: guid(),
      });
    }
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

export const parseComplexItems = (items: ComplexArrayItem[], itemSchema: string[]): ValueSegment[] => {
  if (items.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const currItems = items.filter((item) => {
    let bool = false;
    item.value.forEach((valSegment) => {
      if (valSegment.length > 0) {
        bool = true;
      }
    });
    return bool;
  });
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  ' });
  currItems.forEach((item, index) => {
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '{\n    "' });
    const { value } = item;
    value.forEach((complexItem, index2) => {
      parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: `${itemSchema[index2]}" : "` });
      complexItem?.forEach((segment) => {
        parsedItems.push(segment);
      });
      parsedItems.push({
        id: guid(),
        type: ValueSegmentType.LITERAL,
        value: index2 < value.length - 1 ? '",\n    "' : index < currItems.length - 1 ? '"\n  },' : '"\n  }',
      });
    });
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < currItems.length - 1 ? '\n  ' : '\n]' });
  });
  return parsedItems;
};
