import type { ArrayItemSchema, ComplexArrayItem, ComplexArrayItems, SimpleArrayItem } from '..';
import constants from '../../constants';
import type { ParameterInfo, ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { convertSegmentsToString } from '../../editor/base/utils/parsesegments';
import { guid } from '@microsoft/utils-logic-apps';

export type CastHandler = (parameter: ParameterInfo) => string | undefined;
export interface ItemSchemaItemProps {
  key: string;
  title: string;
  type: string;
  isRequired: boolean;
  description: string;
  format?: string;
  items?: ItemSchemaItemProps[];
}

export const getOneDimensionalSchema = (itemSchema: ArrayItemSchema, isRequired?: any): ItemSchemaItemProps[] => {
  const flattenedSchema: ItemSchemaItemProps[] = [];
  if (!itemSchema) {
    return flattenedSchema;
  }
  if (itemSchema.type === constants.SWAGGER.TYPE.OBJECT && itemSchema.properties) {
    const required = itemSchema.required ?? [];
    Object.entries(itemSchema.properties).forEach(([key, value]) => {
      if (value && key !== 'key') {
        getOneDimensionalSchema(value, required.includes(key)).forEach((item) => {
          const currItem = item;
          flattenedSchema.push(currItem);
        });
      }
    });
  } else {
    const isArray = itemSchema.type === constants.SWAGGER.TYPE.ARRAY && itemSchema.items?.properties;
    flattenedSchema.push({
      key: itemSchema.key,
      title: itemSchema.title ?? itemSchema.key.split('.').slice(-1)[0],
      type: isArray ? constants.SWAGGER.TYPE.ARRAY : itemSchema.type,
      isRequired: !isArray && isRequired,
      description: itemSchema.description ?? '',
      format: itemSchema.format,
      items: isArray && itemSchema.items ? getOneDimensionalSchema(itemSchema.items, isRequired) : undefined,
    });
  }
  return flattenedSchema;
};

// Converts Complex Array Items values to be a string from valuesegment
export const convertComplexItemsToArray = (itemSchema: ArrayItemSchema, items: ComplexArrayItem[], nodeMap?: Map<string, ValueSegment>) => {
  const returnItem: any = {};

  if (itemSchema.type === constants.SWAGGER.TYPE.OBJECT && itemSchema.properties) {
    Object.entries(itemSchema.properties).forEach(([key, value]) => {
      if (key !== 'key' && items) {
        const keyName = value.key.split('.').slice(-1)[0];
        // handle nested array items
        if (value.type === constants.SWAGGER.TYPE.ARRAY && value.items?.properties) {
          const arrayItems = items.find((item) => {
            return item.key === value.key;
          })?.arrayItems;
          if (arrayItems && arrayItems.length > 0) {
            const arrayVal: any = [];
            arrayItems.forEach((arrayItem) => {
              if (value.items) {
                arrayVal.push(convertComplexItemsToArray(value.items, arrayItem.items, nodeMap));
              }
            });
            returnItem[keyName] = arrayVal;
          }
        } else {
          returnItem[keyName] = convertComplexItemsToArray(value, items, nodeMap);
        }
      }
    });
    // add all required schema properties to the return item
    itemSchema.required?.forEach((requiredKey) => {
      if (!returnItem[requiredKey] && itemSchema.properties) {
        returnItem[requiredKey] = '';
      }
    });
  } else {
    const complexItem = items.find((item) => {
      return item.key === itemSchema.key;
    });
    if (complexItem) {
      const segments = complexItem.value;
      const stringValue = convertSegmentsToString(segments, nodeMap);
      return stringValue;
    }
  }
  return returnItem;
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
  itemSchema: ArrayItemSchema,
  setItems: (items: ComplexArrayItems[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed: (b: boolean) => void
): void => {
  const nodeMap = new Map<string, ValueSegment>();
  const stringifiedCollapsedValue = convertSegmentsToString(initialValue, nodeMap);
  validationAndSerializeComplexArray(stringifiedCollapsedValue, nodeMap, itemSchema, setItems, setIsValid, setCollapsed);
};

export const validationAndSerializeComplexArray = (
  editorString: string,
  nodeMap: Map<string, ValueSegment>,
  itemSchema: ArrayItemSchema,
  setItems: (items: ComplexArrayItems[]) => void,
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
      const returnItems: ComplexArrayItems[] = [];
      console.log(jsonEditor);
      jsonEditor.forEach((jsonEditorItem: any) => {
        const complexItem = convertObjectToComplexArrayItemArray(jsonEditorItem, itemSchema, nodeMap);
        returnItems.push({ key: itemSchema.key, items: complexItem });
      });
      setItems(returnItems);
    }
    setIsValid?.(true);
  } catch (e) {
    setIsValid?.(false);
    setCollapsed?.(true);
  }
};

const convertObjectToComplexArrayItemArray = (
  obj: any,
  itemSchema: ArrayItemSchema,
  nodeMap: Map<string, ValueSegment>
): ComplexArrayItem[] => {
  const items: ComplexArrayItem[] = [];

  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];
    if (!itemSchema.properties) return;
    const itemSchemaProperty = itemSchema.properties[key];

    if (Array.isArray(value)) {
      const arrayItems: ComplexArrayItems[] = [];

      value.forEach((arrayItem: any) => {
        if (itemSchemaProperty.items) {
          arrayItems.push({
            key: itemSchemaProperty.key,
            items: convertObjectToComplexArrayItemArray(arrayItem, itemSchemaProperty.items, nodeMap),
          });
        }
      });
      items.push({
        key: itemSchemaProperty.key,
        title: itemSchemaProperty.title ?? itemSchema.key.split('.').slice(-1)[0],
        description: itemSchemaProperty.description ?? '',
        value: [],
        arrayItems,
      });
    } else if (value !== null && typeof value === constants.SWAGGER.TYPE.OBJECT) {
      items.push(...convertObjectToComplexArrayItemArray(value, itemSchemaProperty, nodeMap));
    } else {
      items.push({
        key: itemSchemaProperty.key,
        title: itemSchemaProperty.title ?? itemSchema.key.split('.').slice(-1)[0],
        description: itemSchemaProperty.description ?? '',
        value: convertStringToSegments(value, true, nodeMap),
      });
    }
  });

  if (itemSchema.required) {
    itemSchema.required.forEach((requiredKey) => {
      if (!items.find((item) => item.key === requiredKey)) {
        console.log(itemSchema.properties?.[requiredKey]);
        const itemSchemaProperty = itemSchema.properties?.[requiredKey];
        if (itemSchemaProperty) {
          items.push({
            key: itemSchemaProperty.key,
            title: itemSchemaProperty.title ?? itemSchema.key.split('.').slice(-1)[0],
            description: itemSchemaProperty.description ?? '',
            value: [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }],
          });
        }
      }
    });
  }
  return items;
};
