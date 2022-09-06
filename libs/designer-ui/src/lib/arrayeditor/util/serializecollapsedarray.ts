import type { ArrayEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { guid } from '@microsoft-logic-apps/utils';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

export const serializeArray = (editor: LexicalEditor, setItems: (items: ArrayEditorItemProps[]) => void) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }
    const returnItems: ArrayEditorItemProps[] = [];

    for (const [, value] of Object.entries(jsonEditor)) {
      returnItems.push({
        content: convertStringToSegments(value as string, true, nodeMap),
      });
    }
    setItems(returnItems);
  });
};

export const parseInitialValue = (items: ArrayEditorItemProps[]): ValueSegment[] => {
  if (items.length === 0) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  null\n]' }];
  }
  const parsedItems: ValueSegment[] = [];
  parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '[\n  "' });
  items.forEach((item, index) => {
    const { content } = item;
    content?.forEach((segment) => {
      parsedItems.push(segment);
    });
    parsedItems.push({ id: guid(), type: ValueSegmentType.LITERAL, value: index < items.length - 1 ? '",\n  "' : '"\n]' });
  });
  return parsedItems;
};
