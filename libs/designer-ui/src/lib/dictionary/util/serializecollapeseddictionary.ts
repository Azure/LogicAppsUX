import type { DictionaryEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { $isTokenNode } from '../../editor/base/nodes/tokenNode';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import type { ElementNode, LexicalEditor } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';

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

const getChildrenNodes = (node: ElementNode, nodeMap: Map<string, ValueSegment>): string => {
  let text = '';
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodes(childNode, nodeMap));
    }
    if ($isTextNode(childNode)) {
      text += childNode.__text.trim();
    } else if ($isTokenNode(childNode)) {
      text += childNode.toString();
      nodeMap.set(childNode.toString(), childNode.convertToSegment());
    }
    return text;
  });
  return text;
};
