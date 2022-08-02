import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState, ElementNode } from 'lexical';
import { $getNodeByKey, $getRoot, $isElementNode, $isTextNode } from 'lexical';

export function serializeEditorState(editorState: EditorState, trimLiteral?: boolean): ValueSegment[] {
  const segments: ValueSegment[] = [];
  editorState.read(() => {
    getChildrenNodes($getRoot(), segments, trimLiteral ?? false);
  });
  return segments;
}

const getChildrenNodes = (node: ElementNode, segments: ValueSegment[], trimLiteral: boolean): void => {
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return getChildrenNodes(childNode, segments, trimLiteral);
    }
    if ($isTextNode(childNode)) {
      segments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: trimLiteral ? childNode.__text.trim() : childNode.__text });
    } else if ($isTokenNode(childNode)) {
      segments.push({
        id: guid(),
        type: ValueSegmentType.TOKEN,
        token: childNode.__data?.token,
        value: childNode.__data?.value ?? '',
      });
    }
  });
};

export const convertStringToSegments = (value: string, tokensEnabled?: boolean, nodeMap?: Map<string, ValueSegment>): ValueSegment[] => {
  let currIndex = 0;
  let prevIndex = 0;
  const returnSegments: ValueSegment[] = [];
  while (currIndex < value.length) {
    if (value.substring(currIndex - 2, currIndex) === '$[') {
      if (value.substring(prevIndex, currIndex - 2)) {
        returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: value.substring(prevIndex, currIndex - 2) });
      }
      const newIndex = value.indexOf(']$', currIndex) + 2;
      if (nodeMap && tokensEnabled) {
        const token = nodeMap.get(value.substring(currIndex - 2, newIndex));
        if (token) {
          returnSegments.push(token);
        }
      }
      prevIndex = currIndex = newIndex;
    }
    currIndex++;
  }
  returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: value.substring(prevIndex, currIndex) });
  return returnSegments;
};
