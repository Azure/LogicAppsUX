import type { ValueSegment, TokenType } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import type { ElementNode } from 'lexical';
import { $getNodeByKey, $isElementNode, $isTextNode } from 'lexical';

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
  return (
    collapsedValue?.length === 1 &&
    (collapsedValue[0].type === ValueSegmentType.TOKEN ||
      (collapsedValue[0].type === ValueSegmentType.LITERAL &&
        collapsedValue[0].value.trim().startsWith('"') &&
        collapsedValue[0].value.trim().endsWith('"')))
  );
};

export const initializeValidation = (initialValue?: ValueSegment[]): boolean => {
  const editorString = initialValue?.map((segment) => segment.value).join('');
  return !editorString || isValidDictionary(editorString);
};

export const isValidDictionary = (s: string): boolean => {
  return s.startsWith('{') && s.endsWith('}') && validateDictionaryStrings(s);
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
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
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

// TODO find out how to exit out of recursion when something is found
export const findChildNode = (node: ElementNode, nodeKey: string, tokenType?: TokenType): ValueSegment | null => {
  let foundNode: ValueSegment | null = null;
  node.__children.find((child) => {
    const childNode = $getNodeByKey(child);
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
