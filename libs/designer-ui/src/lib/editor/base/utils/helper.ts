import constants from '../../../constants';
import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import type { TokenType } from '@microsoft/logic-apps-shared';
import { guid } from '@microsoft/logic-apps-shared';
import type { ElementNode } from 'lexical';
import { $getNodeByKey, $isElementNode, $isLineBreakNode, $isTextNode } from 'lexical';
import type { ComboboxItem } from '../../../combobox';

/**
 * Creates a literal value segment.
 * @arg {string} value - The literal value.
 * @arg {string} [segmentId] - The segment id.
 * @return {ValueSegment}
 */
export function createLiteralValueSegment(value: string, segmentId?: string): ValueSegment {
  return {
    id: segmentId ?? guid(),
    type: ValueSegmentType.LITERAL,
    value,
  };
}

export function createEmptyLiteralValueSegment(segmentId?: string): ValueSegment {
  return {
    id: segmentId ?? guid(),
    type: ValueSegmentType.LITERAL,
    value: '',
  };
}

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

export const isSingleLiteralValueSegment = (value: ValueSegment[]): boolean => {
  return value.length === 1 && value[0].type === ValueSegmentType.LITERAL;
};

export const containsTokenSegments = (segments: ValueSegment[]): boolean => {
  return segments.some((segment) => segment.type === ValueSegmentType.TOKEN);
};

export const validateDictionaryStrings = (s: string): boolean => {
  try {
    JSON.parse(s);
  } catch {
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
      text += childNode.getTextContent().trim();
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
      const childNodeText = childNode.getTextContent().trim();
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
  segments.push(createLiteralValueSegment(`"`));
};

export const removeQuotes = (s: string): string => {
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
};

export const getDropdownOptionsFromOptions = (editorOptions: any): ComboboxItem[] => {
  const usedKeys = new Set<string>();
  let dropdownOptions: ComboboxItem[] = editorOptions?.options ?? [];

  // handle cases where the displayName is not a string
  dropdownOptions = dropdownOptions.map((option) => {
    const stringifiedDisplayName = typeof option.displayName === 'string' ? option.displayName : JSON.stringify(option.displayName);
    const baseKey = option.key ?? stringifiedDisplayName;
    let uniqueKey = baseKey;
    let counter = 1;

    while (usedKeys.has(uniqueKey)) {
      uniqueKey = `${baseKey}_${counter}`;
      counter++;
    }

    usedKeys.add(uniqueKey);

    return { ...option, displayName: stringifiedDisplayName, key: uniqueKey };
  });

  return dropdownOptions;
};
