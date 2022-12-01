import type { ComplexArrayItem, ComplexArrayItems, SimpleArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { getIntl } from '@microsoft/logicappsux/intl';
import { guid } from '@microsoft/utils-logic-apps';

export const getOneDimensionalSchema = (itemSchema: any): any[] => {
  const flattenedSchema = flattenObject(itemSchema);
  const returnVal = Object.keys(flattenedSchema).map((key) => {
    return { type: flattenedSchema[key].type, title: key, isRequired: flattenedSchema[key].isRequired };
  });
  return returnVal;
};

export const flattenObject = (obj: any) => {
  const flattened: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !value.type) {
      Object.assign(flattened, flattenObject(value));
    } else {
      flattened[key] = value;
    }
  });

  return flattened;
};

export const convertComplexItemtoSchema = (currItems: any, complexItems: ComplexArrayItem[], nodeMap?: Map<string, ValueSegment>) => {
  const schemafiedItem = JSON.parse(JSON.stringify(currItems));
  Object.keys(currItems).forEach((key) => {
    const value = currItems[key];
    if (value && !Array.isArray(value) && !value.type) {
      schemafiedItem[key] = convertComplexItemtoSchema(value, complexItems, nodeMap);
    } else {
      const valueSegments: ValueSegment[] =
        complexItems.find((item) => {
          return item.title === key;
        })?.value ?? [];
      const stringValue = convertSegmentsToString(valueSegments, nodeMap);
      schemafiedItem[key] = stringValue;
    }
  });

  return schemafiedItem;
};

export const initializeSimpleArrayItems = (
  initialValue: ValueSegment[],
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed: (b: boolean) => void
): void => {
  const nodeMap = new Map<string, ValueSegment>();
  const stringifiedCollapsedValue = convertSegmentsToString(initialValue, nodeMap);
  validationAndSerializeSimpleArray(stringifiedCollapsedValue, nodeMap, setItems, setIsValid, setCollapsed);
  return;
};

export const validationAndSerializeSimpleArray = (
  editorString: string,
  nodeMap: Map<string, ValueSegment>,
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed?: (b: boolean) => void
): void => {
  try {
    const strippedEditorString = editorString.replace(/\s+/g, '');
    if (
      !strippedEditorString.length ||
      strippedEditorString === '[]' ||
      strippedEditorString === 'null' ||
      strippedEditorString === '[null]'
    ) {
      setItems([]);
    } else {
      const jsonEditor = JSON.parse(editorString);
      if (typeof jsonEditor === 'number' || typeof jsonEditor === 'string' || typeof jsonEditor === 'boolean') {
        throw Error();
      }
      const returnItems: SimpleArrayItem[] = [];
      for (const [, value] of Object.entries(jsonEditor)) {
        returnItems.push({
          value: convertStringToSegments(value as string, true, nodeMap),
          key: guid(),
        });
      }
      setItems(returnItems);
    }
    setIsValid?.(true);
  } catch (e) {
    setIsValid?.(false);
    setCollapsed?.(true);
  }
};

export const initializeComplexArrayItems = (
  initialValue: ValueSegment[],
  dimensionalSchema: unknown[],
  setItems: (items: ComplexArrayItems[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed: (b: boolean) => void
): void => {
  const nodeMap = new Map<string, ValueSegment>();
  const stringifiedCollapsedValue = convertSegmentsToString(initialValue, nodeMap);
  validationAndSerializeComplexArray(stringifiedCollapsedValue, nodeMap, dimensionalSchema, setItems, setIsValid, setCollapsed);
};

export const validationAndSerializeComplexArray = (
  editorString: string,
  nodeMap: Map<string, ValueSegment>,
  itemSchema: any,
  setItems: (items: ComplexArrayItems[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed?: (b: boolean) => void,
  setErrorMessage?: (s: string) => void
): void => {
  try {
    const strippedEditorString = editorString.replace(/\s+/g, '');
    if (
      !strippedEditorString.length ||
      strippedEditorString === '[]' ||
      strippedEditorString === 'null' ||
      strippedEditorString === '[null]'
    ) {
      setItems([]);
    } else {
      const jsonEditor = JSON.parse(editorString);
      const returnItems: ComplexArrayItems[] = [];
      jsonEditor.forEach((jsonEditorItem: unknown, index: number) => {
        const flatJSON = flattenObject(jsonEditorItem);
        const returnVal = Object.keys(flatJSON).map((key) => {
          if (
            !getOneDimensionalSchema(itemSchema)
              .map((item) => item.title)
              .includes(key)
          ) {
            const intl = getIntl();
            const errorMessage = intl.formatMessage(
              {
                defaultMessage: 'Array Element {index} has unknown property {property}',
                description: 'Error message for unknown property',
              },
              { index, property: key }
            );
            setErrorMessage?.(errorMessage);
            throw Error();
          }
          return { title: key, value: convertStringToSegments(flatJSON[key], true, nodeMap) };
        });
        if (!validateComplexArrayItem(itemSchema, returnVal, index, setErrorMessage)) {
          throw Error;
        }
        returnItems.push({ key: guid(), items: returnVal });
        setErrorMessage?.('');
      });
      setItems(returnItems);
    }
    setIsValid?.(true);
  } catch (e) {
    setIsValid?.(false);
    setCollapsed?.(true);
  }
};

const validateComplexArrayItem = (
  itemSchema: any,
  complexArrayItem: ComplexArrayItem[],
  index: number,
  setErrorMessage?: (s: string) => void
): boolean => {
  const items = complexArrayItem.map((item) => item.title);
  const dimensionalSchema = getOneDimensionalSchema(itemSchema);
  for (let i = 0; i < dimensionalSchema.length; i++) {
    if (dimensionalSchema[i].isRequired && !items.includes(dimensionalSchema[i].title)) {
      const intl = getIntl();
      const errorMessage = intl.formatMessage(
        {
          defaultMessage: 'Array Element {index} is missing required property {property}',
          description: 'Error message for missing required property',
        },
        { index, property: dimensionalSchema[i].title }
      );
      setErrorMessage?.(errorMessage);
      return false;
    }
  }
  return true;
};

const convertSegmentsToString = (input: ValueSegment[], nodeMap?: Map<string, ValueSegment>): string => {
  let text = '';
  input.forEach((segment) => {
    if (segment.type === ValueSegmentType.LITERAL) {
      text += segment.value;
    } else if (segment.token) {
      const { title, value, brandColor } = segment.token;
      const string = `$[${title},${value},${brandColor}]$`;
      text += string;
      nodeMap?.set(string, segment);
    }
  });
  return text;
};
