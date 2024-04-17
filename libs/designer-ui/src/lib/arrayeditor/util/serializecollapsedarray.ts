import type { ArrayItemSchema, ComplexArrayItems, SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import type { CastHandler } from '../../editor/base';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegment';
import { createLiteralValueSegment, getChildrenNodes, insertQutationForStringType } from '../../editor/base/utils/helper';
import { convertSegmentsToString } from '../../editor/base/utils/parsesegments';
import { convertComplexItemsToArray, validationAndSerializeComplexArray, validationAndSerializeSimpleArray } from './util';
import { prettifyJsonString } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

const emptyArrayValue = [createLiteralValueSegment('[]')];

export const serializeSimpleArray = (
  editor: LexicalEditor,
  valueType: string,
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    validationAndSerializeSimpleArray(editorString, nodeMap, valueType, setItems, setIsValid);
  });
};

export const serializeComplexArray = (
  editor: LexicalEditor,
  itemSchema: ArrayItemSchema,
  setItems: (items: ComplexArrayItems[]) => void,
  setIsValid: (b: boolean) => void
) => {
  editor.getEditorState().read(() => {
    const nodeMap = new Map<string, ValueSegment>();
    const editorString = getChildrenNodes($getRoot(), nodeMap);
    validationAndSerializeComplexArray(editorString, nodeMap, itemSchema, setItems, setIsValid, undefined);
  });
};

export const parseSimpleItems = (
  items: SimpleArrayItem[],
  itemSchema: ArrayItemSchema,
  castParameter: CastHandler
): { castedValue: ValueSegment[]; uncastedValue: ValueSegment[] } => {
  if (items.length === 0) {
    return { castedValue: emptyArrayValue, uncastedValue: emptyArrayValue };
  }
  const { type, format } = itemSchema;
  const castedArraySegments: ValueSegment[] = [];
  const uncastedArraySegments: ValueSegment[] = [];
  castedArraySegments.push(createLiteralValueSegment('[\n  '));
  uncastedArraySegments.push(createLiteralValueSegment('[\n  '));
  items.forEach((item, index) => {
    const { value } = item;
    if (value?.length === 0) {
      castedArraySegments.push(createLiteralValueSegment('""'));
      uncastedArraySegments.push(createLiteralValueSegment('""'));
    } else {
      insertQutationForStringType(castedArraySegments, type);
      insertQutationForStringType(uncastedArraySegments, type);
      castedArraySegments.push(createLiteralValueSegment(castParameter(value, type, format)));
      uncastedArraySegments.push(...value);
      insertQutationForStringType(castedArraySegments, type);
      insertQutationForStringType(uncastedArraySegments, type);
    }
    castedArraySegments.push(createLiteralValueSegment(index < items.length - 1 ? ',\n  ' : '\n]'));
    uncastedArraySegments.push(createLiteralValueSegment(index < items.length - 1 ? ',\n  ' : '\n]'));
  });

  // Beautify ValueSegment
  try {
    const nodeMap = new Map<string, ValueSegment>();
    const stringValueCasted = prettifyJsonString(convertSegmentsToString(castedArraySegments, nodeMap));
    const stringValueUncasted = prettifyJsonString(convertSegmentsToString(uncastedArraySegments, nodeMap));
    return {
      castedValue: convertStringToSegments(stringValueCasted, nodeMap, { tokensEnabled: false }),
      uncastedValue: convertStringToSegments(stringValueUncasted, nodeMap, { tokensEnabled: true }),
    };
  } catch (e) {
    return { uncastedValue: uncastedArraySegments, castedValue: castedArraySegments };
  }
};

export const parseComplexItems = (
  allItems: ComplexArrayItems[],
  itemSchema: ArrayItemSchema,
  castParameter: CastHandler,
  suppressCastingForSerialize?: boolean
): { castedValue: ValueSegment[]; uncastedValue: ValueSegment[] } => {
  if (allItems.length === 0) {
    return { castedValue: emptyArrayValue, uncastedValue: emptyArrayValue };
  }
  const castedArrayVal: any = [];
  const uncastedArrayVal: any = [];
  const nodeMap = new Map<string, ValueSegment>();
  allItems.forEach((currItem) => {
    const { items } = currItem;
    castedArrayVal.push(
      convertComplexItemsToArray(itemSchema, items, nodeMap, /*suppress casting*/ suppressCastingForSerialize ?? false, castParameter)
    );
    uncastedArrayVal.push(convertComplexItemsToArray(itemSchema, items, nodeMap, /*suppress casting*/ true, castParameter));
  });
  return {
    castedValue: convertStringToSegments(JSON.stringify(castedArrayVal, null, 4), nodeMap, { tokensEnabled: true }),
    uncastedValue: convertStringToSegments(JSON.stringify(uncastedArrayVal, null, 4), nodeMap, { tokensEnabled: true }),
  };
};
