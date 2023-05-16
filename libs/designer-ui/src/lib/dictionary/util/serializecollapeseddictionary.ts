import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
import { guid } from '@microsoft/utils-logic-apps';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

export const serializeDictionary = (editor: LexicalEditor, setItems: (items: DictionaryEditorItemProps[]) => void) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
    } catch (e) {
      console.log(e);
    }
    const returnItems: DictionaryEditorItemProps[] = [];

    for (const [key, value] of Object.entries(jsonEditor)) {
      const newKey = key.toString();
      const newValue = (value as string).toString();
      returnItems.push({
        id: guid(),
        key: convertStringToSegments(newKey as string, true, nodeMap),
        value: convertStringToSegments(newValue as string, true, nodeMap),
      });
    }
    setItems(returnItems);
  });
};
