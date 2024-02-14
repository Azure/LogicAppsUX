import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import type { SegmentParserOptions } from './parsesegments';
import { guid } from '@microsoft/utils-logic-apps';
import type { EditorState, ElementNode } from 'lexical';
import { $getNodeByKey, $getRoot, $isElementNode, $isLineBreakNode, $isTextNode } from 'lexical';

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

export const convertStringToSegments = (
  value: string,
  nodeMap: Map<string, ValueSegment>,
  options?: SegmentParserOptions
): ValueSegment[] => {
  if (!value) return [];

  const { tokensEnabled } = options ?? {};

  if (typeof value !== 'string' || !tokensEnabled) {
    return [{ id: guid(), type: ValueSegmentType.LITERAL, value }];
  }

  const returnSegments: ValueSegment[] = [];

  let currSegmentType: ValueSegmentType = ValueSegmentType.LITERAL;
  let isInQuotedString = false;
  let segmentSoFar = '';

  for (let currIndex = 0; currIndex < value.length; currIndex++) {
    const currChar = value[currIndex];
    const nextChar = value[currIndex + 1];

    if (currChar === `'`) {
      if (isInQuotedString) {
        isInQuotedString = false;
      } else if (currSegmentType === ValueSegmentType.TOKEN) {
        // Quoted strings should only be handled inside `@{}` contexts.
        isInQuotedString = true;
      }
    }

    if (!isInQuotedString && currChar === '@' && nextChar === '{') {
      if (segmentSoFar) {
        // If we found a new token, then even if `currSegmentType` is `ValueSegmentType.TOKEN`, we treat the
        // value as a literal since the token did not close. Worth noting: This means that if a token has `@{`
        // inside of it (outside of single-quotes), it will not be supported as a token. (e.g. `@{@{}`)
        returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: segmentSoFar });
        segmentSoFar = '';
      }
      currSegmentType = ValueSegmentType.TOKEN;
    }

    segmentSoFar += currChar;

    if (!isInQuotedString && currChar === '}' && currSegmentType === ValueSegmentType.TOKEN) {
      const token = nodeMap.get(segmentSoFar);
      if (token) {
        returnSegments.push(token);
        currSegmentType = ValueSegmentType.LITERAL;
        segmentSoFar = '';
      }
    }
  }

  if (segmentSoFar) {
    // Treat anything remaining as `ValueSegmentType.LITERAL`, even if `currSegmentType` is not; this is to
    // ensure that if we opened a token with `@{`, but it has no end, we just treat the remaining text as a literal.
    returnSegments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: segmentSoFar });
  }

  collapseLiteralSegments(returnSegments);

  return returnSegments;
};

const collapseLiteralSegments = (segments: ValueSegment[]): void => {
  let index = 0;
  while (index < segments.length) {
    const currSegment = segments[index];
    const nextSegment = segments[index + 1];

    if (currSegment?.type === ValueSegmentType.LITERAL && nextSegment?.type === ValueSegmentType.LITERAL) {
      currSegment.value += nextSegment.value;
      segments.splice(index + 1, 1);
      continue;
    }

    index++;
  }
};
