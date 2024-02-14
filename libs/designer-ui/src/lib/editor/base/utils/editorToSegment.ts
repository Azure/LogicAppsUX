import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState, ElementNode } from 'lexical';
import { $getNodeByKey, $getRoot, $isElementNode, $isLineBreakNode, $isTextNode } from 'lexical';
import type { SegmentParserOptions } from './parsesegments';

export function serializeEditorState(editorState: EditorState, trimLiteral = false): ValueSegment[] {
  const segments: ValueSegment[] = [];
  editorState.read(() => {
    getChildrenNodesToSegments($getRoot(), segments, trimLiteral);
  });
  return segments;
}

const getChildrenNodesToSegments = (node: ElementNode, segments: ValueSegment[], trimLiteral = false): void => {
  node.getChildren().forEach((child, index) => {
    const childNode = $getNodeByKey(child.getKey());
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
    } else if ($isLineBreakNode(childNode)) {
      segments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: '\n' });
    }
  });
};

export const convertStringToSegments = (value: string, nodeMap: Map<string, ValueSegment>, options?: SegmentParserOptions): ValueSegment[] => {
  if (!value) return [];

  const { tokensEnabled } = options ?? {};

  if (typeof value !== 'string' || !tokensEnabled) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value }];
  }

  const returnSegments: ValueSegment[] = [];

  let currIndex = 0;
  let prevIndex = 0;
  // let currSegmentType: ValueSegmentType = ValueSegmentType.LITERAL;
  // let segmentSoFar = '';

  while (currIndex < value.length) {
    /*
    const currChar = value[currIndex];
    const nextChar = value[currIndex + 1];

    if (currChar === '@' && nextChar === '{') {
      if (segmentSoFar) {
        returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: segmentSoFar });
        segmentSoFar = '';
      }
      currSegmentType = ValueSegmentType.TOKEN;
    } else if (currChar === '}' && currSegmentType === ValueSegmentType.TOKEN) {

    }

    segmentSoFar += currChar;
    currIndex++;
    */

    if (value.substring(currIndex - 2, currIndex) === '@{' && tokensEnabled) {
      if (value.substring(prevIndex, currIndex - 2)) {
        returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: value.substring(prevIndex, currIndex - 2) });
      }
      const endIndex = value.indexOf('}', currIndex);
      if (endIndex < 0) {
        currIndex++;
        continue;
      }
      const newIndex = endIndex + 1;
      if (nodeMap) {
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
