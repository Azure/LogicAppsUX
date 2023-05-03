import type { ComplexArrayItem, ComplexArrayItems, SimpleArrayItem } from '..';
import constants from '../../constants';
import type { ValueSegment } from '../../editor';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegement';
import { convertSegmentsToString } from '../../editor/base/utils/parsesegments';
import { getIntl } from '@microsoft/intl-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';

export interface ItemSchemaItemProps {
  title: string;
  type: string;
  isRequired: boolean;
  description: string;
  key: string;
}

export const getOneDimensionalSchema = (itemSchema: any, isRequired?: any): ItemSchemaItemProps[] => {
  const flattenedSchema: ItemSchemaItemProps[] = [];
  if (!itemSchema) {
    return flattenedSchema;
  }
  if (itemSchema.type === constants.SWAGGER.TYPE.OBJECT && itemSchema.properties) {
    const required = itemSchema.required ?? [];
    Object.keys(itemSchema.properties).forEach((key) => {
      const value = itemSchema.properties[key];
      if (value) {
        getOneDimensionalSchema(value, required.includes(key)).forEach((item) => {
          const currItem = item;
          if (!item.key) {
            currItem.key = key;
          }
          flattenedSchema.push(currItem);
        });
      }
    });
  } else {
    flattenedSchema.push({
      title: itemSchema.title,
      type: itemSchema.type,
      isRequired: isRequired ?? false,
      description: itemSchema.description ?? '',
      key: '',
    });
  }
  return flattenedSchema;
};

const flattenObject = (obj: any) => {
  const flattened: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === constants.SWAGGER.TYPE.OBJECT && value !== null && !Array.isArray(value) && !value.type) {
      Object.assign(flattened, flattenObject(value));
    } else {
      flattened[key] = value;
    }
  });

  return flattened;
};

// Converts Complex Array Items values to be a string from valuesegment
export const convertComplexItemsToArray = (
  itemSchema: ItemSchemaItemProps[],
  items: ComplexArrayItem[],
  nodeMap?: Map<string, ValueSegment>
) => {
  const returnItem: any = {};
  itemSchema.forEach((item) => {
    if (item.isRequired) {
      returnItem[item.key] = '';
    }
  });
  items.forEach((item) => {
    const segments = item.value;
    const stringValue = convertSegmentsToString(segments, nodeMap);
    const itemSchemaItem = itemSchema.find((schemaItem) => {
      return schemaItem.title === item.title;
    });
    const itemKey = itemSchemaItem?.key ?? item.title;
    returnItem[itemKey] = stringValue;
  });
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
  dimensionalSchema: ItemSchemaItemProps[],
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
  itemSchema: ItemSchemaItemProps[],
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
      console.log(jsonEditor);
      const returnItems: ComplexArrayItems[] = [];
      jsonEditor.forEach((jsonEditorItem: any, index: number) => {
        const flatJSON = flattenObject(jsonEditorItem);
        const returnVal = Object.keys(flatJSON).map((key) => {
          if (itemSchema.map((item) => item.key).includes(key)) {
            return { title: key, value: convertStringToSegments(flatJSON[key], true, nodeMap) };
          } else {
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
        });
        if (!validateComplexArrayItem(itemSchema, returnVal, index, setErrorMessage)) {
          throw Error();
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
  itemSchema: ItemSchemaItemProps[],
  complexArrayItem: ComplexArrayItem[],
  index: number,
  setErrorMessage?: (s: string) => void
): boolean => {
  const items = complexArrayItem.map((item) => item.title);
  for (let i = 0; i < itemSchema.length; i++) {
    if (itemSchema[i].isRequired && !items.includes(itemSchema[i].key)) {
      const intl = getIntl();
      const errorMessage = intl.formatMessage(
        {
          defaultMessage: 'Array Element {index} is missing required property {property}',
          description: 'Error message for missing required property',
        },
        { index, property: itemSchema[i].title }
      );
      setErrorMessage?.(errorMessage);
      return false;
    }
  }
  return true;
};
