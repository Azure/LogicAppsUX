import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { createLiteralValueSegment } from './helper';
import type { SegmentParserOptions } from './parsesegments';
import { guid } from '@microsoft/logic-apps-shared';
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
        segments.push(createLiteralValueSegment('\n'));
      }
      return getChildrenNodesToSegments(childNode, segments, trimLiteral);
    }
    if ($isTextNode(childNode)) {
      segments.push(createLiteralValueSegment(trimLiteral ? childNode.__text.trim() : childNode.__text));
    } else if ($isTokenNode(childNode)) {
      segments.push(childNode.__data);
    } else if ($isLineBreakNode(childNode)) {
      segments.push(createLiteralValueSegment('\n'));
    }
  });
};

export const convertStringToSegments = (
  value: string,
  nodeMap: Map<string, ValueSegment>,
  options?: SegmentParserOptions,
  convertSpaceToNewline?: boolean
): ValueSegment[] => {
  if (!value) {
    return [];
  }

  const { tokensEnabled } = options ?? {};

  if (typeof value !== 'string' || !tokensEnabled) {
    return [createLiteralValueSegment(value)];
  }

  const returnSegments: ValueSegment[] = [];

  let currSegmentType: ValueSegmentType = ValueSegmentType.LITERAL;
  let isInQuotedString = false;
  let doubleQuotesStarted = false;
  let segmentSoFar = '';

  for (let currIndex = 0; currIndex < value.length; currIndex++) {
    const currChar = value[currIndex];
    const nextChar = value[currIndex + 1];
    const prevChar = value[currIndex - 1];

    if (currChar === `'`) {
      if (isInQuotedString) {
        isInQuotedString = false;
      } else if (currSegmentType === ValueSegmentType.TOKEN) {
        // Quoted strings should only be handled inside `@{}` contexts.
        isInQuotedString = true;
      }
    }

    // If unescaped double quotes are encountered in string, they are not part of the value typed by user. It is likely from Json stringification for a key/value.
    if (currChar === '"' && prevChar !== '\\' && currSegmentType === ValueSegmentType.LITERAL) {
      doubleQuotesStarted = !doubleQuotesStarted;
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
      let token: ValueSegment | undefined = undefined;

      // removes formatting compatibility issues between nodemap and HTML text in the editor
      // when opening an action with an HTML editor
      if (convertSpaceToNewline) {
        // modifiedSegmentSoFar -> in segmentSoFar, replace spaces with no space
        const modifiedSegmentSoFar = removeNewlinesAndSpaces(segmentSoFar);
        // for each key in nodeMap
        for (const key of nodeMap.keys()) {
          // keyNoNewline = key, but replace all newlines with no space
          const keyNoNewline = removeNewlinesAndSpaces(key);
          // if the nodemap key and modified HTML segment match,
          // take the corresponding HTML node in the nodemap
          if (keyNoNewline === modifiedSegmentSoFar) {
            token = nodeMap.get(key);
            break;
          }
        }
      } else {
        token = nodeMap.get(segmentSoFar);
      }

      if (token) {
        // If remove quotes param is set, remove the quotes from previous and next segments if it's a single token
        if (options?.removeSingleTokenQuotesWrapping && doubleQuotesStarted && returnSegments.length > 0) {
          const prevSegment = returnSegments.pop();

          // If previous and next segments are not tokens (i.e. this is a single token), and they end and start with quotes, remove the quotes
          if (prevSegment?.type === ValueSegmentType.LITERAL && prevSegment?.value.endsWith('"') && nextChar === '"') {
            prevSegment.value = prevSegment.value.slice(0, -1);
            doubleQuotesStarted = false;

            // Skip quotes starting in next segment
            currIndex++;
          }

          if (prevSegment) {
            returnSegments.push(prevSegment);
          }
        }

        returnSegments.push(token);
        currSegmentType = ValueSegmentType.LITERAL;
        segmentSoFar = '';
      }
    }
  }

  if (segmentSoFar) {
    // Treat anything remaining as `ValueSegmentType.LITERAL`, even if `currSegmentType` is not; this is to
    // ensure that if we opened a token with `@{`, but it has no end, we just treat the remaining text as a literal.
    returnSegments.push(createLiteralValueSegment(segmentSoFar));
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

const removeNewlinesAndSpaces = (inputStr: string): string => {
  return inputStr.replace(/\s+/g, '').replaceAll(/\n/g, '');
};
