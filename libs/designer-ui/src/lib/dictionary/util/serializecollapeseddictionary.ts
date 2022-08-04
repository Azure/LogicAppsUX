import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../editor/base/utils/helper';
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
      returnItems.push({
        key: convertStringToSegments(key as string, true, nodeMap),
        value: convertStringToSegments(value as string, true, nodeMap),
      });
    }
    setItems(returnItems);
  });
};
