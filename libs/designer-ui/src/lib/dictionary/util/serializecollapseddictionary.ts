import type { DictionaryEditorItemProps } from '..';
import constants from '../../constants';
import type { ValueSegment } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegment';
import { getChildrenNodesWithTokenInterpolation, removeQuotes } from '../../editor/base/utils/helper';
import { guid } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

export const serializeDictionary = (
  editor: LexicalEditor,
  setItems: (items: DictionaryEditorItemProps[]) => void,
  setIsValid: (isValid: boolean) => void,
  keyType?: string,
  valueType?: string
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodesWithTokenInterpolation($getRoot(), nodeMap);
    let jsonEditor;
    try {
      jsonEditor = JSON.parse(editorString);
      const returnItems: DictionaryEditorItemProps[] = [];

      for (const [key, value] of Object.entries(jsonEditor)) {
        const newKey = keyType === constants.SWAGGER.TYPE.STRING ? (key as string) : removeQuotes(JSON.stringify(key));
        const newValue = valueType === constants.SWAGGER.TYPE.STRING ? (value as string) : removeQuotes(JSON.stringify(value));
        returnItems.push({
          id: guid(),
          key: convertStringToSegments(newKey, nodeMap, { tokensEnabled: true }),
          value: convertStringToSegments(newValue, nodeMap, { tokensEnabled: true }),
        });
      }
      setItems(returnItems);
      setIsValid(true);
    } catch (e) {
      setIsValid(false);
    }
  });
};
