import constants from '../../../constants';
import type { ValueSegment, TokenType } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import { guid } from '@microsoft/utils-logic-apps';
import type { ElementNode } from 'lexical';
import { $getNodeByKey, $isElementNode, $isLineBreakNode, $isTextNode } from 'lexical';

export const removeFirstAndLast = (segments: ValueSegment[], removeFirst?: string, removeLast?: string): ValueSegment[] => {
  const n = segments.length - 1;
  segments.forEach((segment, i) => {
    const currentSegment = segment;
    if (currentSegment.type === ValueSegmentType.LITERAL) {
      if (i === 0 && currentSegment.value.charAt(0) === removeFirst) {
        currentSegment.value = currentSegment.value.slice(1);
      } else if (i === n && currentSegment.value.charAt(currentSegment.value.length - 1) === removeLast) {
        currentSegment.value = currentSegment.value.slice(0, -1);
      }
    }
  });
  return segments;
};

export const showCollapsedValidation = (collapsedValue: ValueSegment[]): boolean => {
  return collapsedValue?.length === 1;
};

export const isTokenValueSegment = (value: ValueSegment[]): boolean => {
  return value.length === 1 && value[0].type === ValueSegmentType.TOKEN;
};

export const validateDictionaryStrings = (s: string): boolean => {
  try {
    JSON.parse(s);
  } catch (e) {
    return false;
  }
  return true;
};

export const getChildrenNodes = (node: ElementNode, nodeMap?: Map<string, ValueSegment>): string => {
  let text = '';
  node.getChildren().forEach((child) => {
    const childNode = $getNodeByKey(child.getKey());
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodes(childNode, nodeMap));
    }
    if ($isTextNode(childNode)) {
      text += childNode.__text.trim();
    } else if ($isTokenNode(childNode)) {
      text += childNode.toString();
      nodeMap?.set(childNode.toString(), childNode.convertToSegment());
    }
    return text;
  });
  return text;
};

// interpolate tokens if they have not been interpolated
export const getChildrenNodesWithTokenInterpolation = (node: ElementNode, nodeMap?: Map<string, ValueSegment>): string => {
  let text = '';
  let lastNodeWasText = '';
  let lastNodeWasToken = '';
  let numberOfDoubleQuotes = 0;
  let numberOfQuotesAdded = 0;
  node.getChildren().forEach((child) => {
    const childNode = $getNodeByKey(child.getKey());
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodesWithTokenInterpolation(childNode, nodeMap));
    }
    if ($isTextNode(childNode)) {
      const childNodeText = childNode.__text.trim();
      if (childNodeText.includes('"')) {
        numberOfQuotesAdded = 0; // reset, the interpolation will be added with childNode
      }
      const missingAClosingInterpolation = numberOfQuotesAdded !== 0 && numberOfQuotesAdded % 2 === 1;
      if (lastNodeWasToken === childNode.__prev && missingAClosingInterpolation) {
        text += `"`;
      }
      text += childNodeText;
      lastNodeWasText = childNode.__key;
    } else if ($isTokenNode(childNode)) {
      numberOfDoubleQuotes = (text.replace(/\\"/g, '').match(/"/g) || []).length;
      if (lastNodeWasText === childNode.__prev && numberOfDoubleQuotes % 2 !== 1) {
        text += `"`;
        numberOfQuotesAdded++;
      }
      text += childNode.toString();
      nodeMap?.set(childNode.toString(), childNode.convertToSegment());
      lastNodeWasToken = childNode.__key;
    }
    if ($isLineBreakNode(childNode)) {
      if (lastNodeWasText === childNode.__prev) {
        lastNodeWasText = childNode.__key;
      }
      if (lastNodeWasToken === childNode.__prev) {
        lastNodeWasToken = childNode.__key;
      }
    }
    return text;
  });
  return text;
};

export const findChildNode = (node: ElementNode, nodeKey: string, tokenType?: TokenType): ValueSegment | null => {
  let foundNode: ValueSegment | null = null;
  node.getChildren().find((child) => {
    const childNode = $getNodeByKey(child.getKey());
    if (childNode && $isElementNode(childNode)) {
      const recurse = findChildNode(childNode, nodeKey, tokenType);
      if (recurse) {
        foundNode = recurse;
      }
    }
    if ($isTokenNode(childNode) && nodeKey === childNode.__key && childNode.__data.token?.tokenType === tokenType) {
      foundNode = childNode.__data;
    }
    return foundNode;
  });
  return foundNode;
};

// checks the equality of two value segments
export const notEqual = (a: ValueSegment[], b: ValueSegment[]): boolean => {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    const newA = { token: a[i].token, value: a[i].value };
    const newB = { token: b[i].token, value: b[i].value };
    if (a[i].type !== b[i].type) {
      return true;
    }
    if (JSON.stringify(newA, Object.keys(newA).sort()) !== JSON.stringify(b[i], Object.keys(newB).sort())) {
      return true;
    }
  }
  return false;
};

export const insertQutationForStringType = (segments: ValueSegment[], type?: string) => {
  if (type === constants.SWAGGER.TYPE.STRING) {
    addStringLiteralSegment(segments);
  }
};

const addStringLiteralSegment = (segments: ValueSegment[]): void => {
  segments.push({ id: guid(), type: ValueSegmentType.LITERAL, value: `"` });
};

export const removeQuotes = (s: string): string => {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
};
