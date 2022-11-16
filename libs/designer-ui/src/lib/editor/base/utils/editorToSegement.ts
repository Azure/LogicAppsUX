import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState, ElementNode } from 'lexical';
import { $getNodeByKey, $getRoot, $isElementNode, $isTextNode } from 'lexical';

export function serializeEditorState(editorState: EditorState, trimLiteral = false): ValueSegment[] {
  const segments: ValueSegment[] = [];
  editorState.read(() => {
    getChildrenNodesToSegments($getRoot(), segments, trimLiteral);
  });
  return segments;
}

const getChildrenNodesToSegments = (node: ElementNode, segments: ValueSegment[], trimLiteral = false): void => {
  node.__children.forEach((child, index) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      if (!trimLiteral && /* ignore first paragraph node */ index > 0) {
        segments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '\n' });
      }
      return getChildrenNodesToSegments(childNode, segments, trimLiteral);
    }
    if ($isTextNode(childNode)) {
      segments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: trimLiteral ? childNode.__text.trim() : childNode.__text });
    } else if ($isTokenNode(childNode)) {
      segments.push(childNode.__data);
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
