import type { ComboboxItem } from '../../combobox';
import type { ArrayItemSchema, ComplexArrayItem, ComplexArrayItems, SimpleArrayItem } from '..';
import constants from '../../constants';
import type { ValueSegment } from '../../editor';
import type { CastHandler } from '../../editor/base';
import { convertStringToSegments } from '../../editor/base/utils/editorToSegment';
import { convertSegmentsToString } from '../../editor/base/utils/parsesegments';
import { ExtensionProperties, guid } from '@microsoft/logic-apps-shared';
import type { DropdownItem } from '../../dropdown';

export interface ItemSchemaItemProps {
  key: string;
  title: string;
  type: string;
  isRequired: boolean;
  description: string;
  format?: string;
  items?: ItemSchemaItemProps[];
  readOnly?: boolean;
  enum?: string[];
  [property: string]: any;
}

export const hideComplexArray = (dimensionalSchema: ItemSchemaItemProps[]) => {
  if (dimensionalSchema.length === 0) {
    return true;
  }
  return dimensionalSchema.every((item) => item.readOnly === true);
};

export const getOneDimensionalSchema = (itemSchema: ArrayItemSchema, isRequired: boolean): ItemSchemaItemProps[] => {
  if (!itemSchema || itemSchema[ExtensionProperties.Visibility] === 'internal') {
    return [];
  }

  const { type, format, key, title, description = '', readOnly, properties, required, items } = itemSchema;

  if (type === constants.SWAGGER.TYPE.OBJECT && properties) {
    const requiredElements = required ?? [];
    return Object.entries(properties).flatMap(([key, value]) =>
      key !== 'key' && value ? getOneDimensionalSchema(value, isRequired && requiredElements.includes(key)) : []
    );
  }

  const isArray = type === constants.SWAGGER.TYPE.ARRAY && items;
  return [
    {
      key,
      title: handleTitle(key, title),
      type,
      isRequired: !isArray && isRequired,
      description,
      format,
      enum: itemSchema.enum,
      items: isArray ? getOneDimensionalSchema(items, isRequired) : undefined,
      readOnly,
    },
  ];
};
// Converts Complex Array Items values from ValueSegments Arrays to Strings
export const convertComplexItemsToArray = (
  itemSchema: ArrayItemSchema,
  items: ComplexArrayItem[],
  isParentRequired: boolean,
  nodeMap?: Map<string, ValueSegment>,
  suppressCasting?: boolean,
  castParameter?: CastHandler
) => {
  const returnItem: Record<string, any> = {};
  // Process object type schema
  if (itemSchema.type === constants.SWAGGER.TYPE.OBJECT && itemSchema.properties) {
    const requiredKeys = new Set(itemSchema.required ?? []);

    Object.entries(itemSchema.properties).forEach(([key, value]) => {
      if (key !== 'key' && items) {
        const keyName = value.key.split('.').pop() as string;
        const isKeyRequired = requiredKeys.has(keyName) && isParentRequired;

        // Handle nested array items
        if (value.type === constants.SWAGGER.TYPE.ARRAY && value.items?.properties) {
          handleArrayItems(value, items, isKeyRequired, keyName, returnItem, nodeMap, suppressCasting, castParameter);
        } else {
          handleSimpleItem(value, items, isKeyRequired, keyName, returnItem, nodeMap, suppressCasting, castParameter);
        }
      }
    });
  } else {
    const complexItem = items.find((item) => item.key === itemSchema.key);
    if (complexItem) {
      if (complexItem.arrayItems && itemSchema.type === constants.SWAGGER.TYPE.ARRAY) {
        return handleArrayOfComplexItems(itemSchema, complexItem, isParentRequired, nodeMap, suppressCasting, castParameter);
      }
      const segments = complexItem.value;

      // we need to convert to string to extract tokens to repopulate later
      const stringValue = convertSegmentsToString(segments, nodeMap);
      const castedValue = castParameter?.(segments, itemSchema.type, itemSchema.format, suppressCasting);
      return suppressCasting ? stringValue : castedValue;
    }
  }
  return returnItem;
};

// Helper to convert array items to complex item schema
const handleArrayItems = (
  value: ArrayItemSchema,
  items: ComplexArrayItem[],
  isKeyRequired: boolean,
  keyName: string,
  returnItem: Record<string, any>,
  nodeMap?: Map<string, ValueSegment>,
  suppressCasting?: boolean,
  castParameter?: CastHandler
) => {
  const arrayItems = items.find((item) => item.key === value.key)?.arrayItems;

  if (arrayItems?.length) {
    const arrayVal: any = [];
    arrayItems.forEach((arrayItem) => {
      if (value.items) {
        arrayVal.push(convertComplexItemsToArray(value.items, arrayItem.items, isKeyRequired, nodeMap, suppressCasting, castParameter));
      }
    });
    returnItem[keyName] = arrayVal;
  } else if (isKeyRequired) {
    returnItem[keyName] = [];
  }
};

// Helper to convert simple items to complex item schema
const handleSimpleItem = (
  value: ArrayItemSchema,
  items: ComplexArrayItem[],
  isKeyRequired: boolean,
  keyName: string,
  returnItem: Record<string, any>,
  nodeMap?: Map<string, ValueSegment>,
  suppressCasting?: boolean,
  castParameter?: CastHandler
) => {
  const convertedItem = convertComplexItemsToArray(value, items, isKeyRequired, nodeMap, suppressCasting, castParameter);

  if (convertedItem && (typeof convertedItem === 'string' || Object.keys(convertedItem).length > 0)) {
    returnItem[keyName] = castParameterValueToPrimitiveType(convertedItem, value?.type);
  } else if (isKeyRequired) {
    returnItem[keyName] = null;
  }
};

// Helper to handle an array of complex items
const handleArrayOfComplexItems = (
  itemSchema: ArrayItemSchema,
  complexItem: ComplexArrayItem,
  isParentRequired: boolean,
  nodeMap?: Map<string, ValueSegment>,
  suppressCasting?: boolean,
  castParameter?: CastHandler
) => {
  if (!complexItem.arrayItems) {
    return [];
  }
  const arrayVal: any = [];
  complexItem.arrayItems.forEach((arrayItem) => {
    const isArrayItemRequired = !!itemSchema.required?.includes(arrayItem.key.split('.').pop() as string) && isParentRequired;
    if (itemSchema.items) {
      arrayVal.push(
        convertComplexItemsToArray(itemSchema.items, arrayItem.items, isArrayItemRequired, nodeMap, suppressCasting, castParameter)
      );
    }
  });
  return arrayVal;
};

const castParameterValueToPrimitiveType = (value: any, parameterType?: string): any => {
  if (parameterType === constants.SWAGGER.TYPE.BOOLEAN) {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'false') {
      return lowerValue === 'true';
    }
  } else if (parameterType === constants.SWAGGER.TYPE.INTEGER) {
    const intValue = Number.parseInt(value, 10);
    if (!Number.isNaN(intValue)) {
      return intValue;
    }
  }
  return value;
};

export const initializeSimpleArrayItems = (
  initialValue: ValueSegment[],
  valueType: string,
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed: (b: boolean) => void
) => {
  const nodeMap = new Map<string, ValueSegment>();
  const stringifiedCollapsedValue = convertSegmentsToString(initialValue, nodeMap);
  validationAndSerializeSimpleArray(stringifiedCollapsedValue, nodeMap, valueType, setItems, setIsValid, setCollapsed);
};

export const validationAndSerializeSimpleArray = (
  editorString: string,
  nodeMap: Map<string, ValueSegment>,
  valueType: string,
  setItems: (items: SimpleArrayItem[]) => void,
  setIsValid: (b: boolean) => void,
  setCollapsed?: (b: boolean) => void
): void => {
  try {
    const strippedEditorString = editorString.replace(/\s+/g, '');
    if (!strippedEditorString.length || strippedEditorString === 'null' || strippedEditorString === '[null]') {
      setItems([{ key: guid(), value: [] }]);
    } else {
      const jsonEditor = JSON.parse(editorString);
      const returnItems: SimpleArrayItem[] = [];
      for (const [, value] of Object.entries(jsonEditor)) {
        returnItems.push({
          value: convertStringToSegments(
            valueType === constants.SWAGGER.TYPE.STRING ? (value as string) : JSON.stringify(value, null, 4),
            nodeMap,
            { tokensEnabled: true }
          ),
          key: guid(),
        });
      }
      setItems(returnItems);
    }
    setIsValid?.(true);
  } catch {
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
      jsonEditor.forEach((jsonEditorItem: any) => {
        const complexItem = convertObjectToComplexArrayItemArray(jsonEditorItem, itemSchema, nodeMap);
        returnItems.push({ key: itemSchema.key, items: complexItem });
      });
      setItems(returnItems);
    }
    setIsValid?.(true);
  } catch {
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

  if (typeof obj === 'string') {
    return [
      {
        key: itemSchema.key,
        title: handleTitle(itemSchema.key, itemSchema.title),
        description: itemSchema.description ?? '',
        value: convertStringToSegments(obj, nodeMap, { tokensEnabled: true }),
      },
    ];
  }

  Object.keys(obj).forEach((key: string) => {
    const value = obj[key];
    if (!itemSchema.properties) {
      return;
    }
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
        title: handleTitle(itemSchema.key, itemSchemaProperty.title),
        description: itemSchemaProperty.description ?? '',
        value: [],
        arrayItems,
      });
    } else if (value !== null && typeof value === constants.SWAGGER.TYPE.OBJECT) {
      items.push(...convertObjectToComplexArrayItemArray(value, itemSchemaProperty, nodeMap));
    } else {
      items.push({
        key: itemSchemaProperty.key,
        title: handleTitle(itemSchema.key, itemSchemaProperty.title),
        description: itemSchemaProperty.description ?? '',
        value: convertStringToSegments(String(value), nodeMap, { tokensEnabled: true }),
      });
    }
  });
  return items;
};

const handleTitle = (key: string, title?: string): string => {
  const keyArray = key.split('.').filter((k) => k !== 'properties');
  if (title) {
    keyArray.pop();
    keyArray.push(title);
  }
  const resultArray = capitalizeElements(keyArray);
  return resultArray.join(' ');
};

const capitalizeElements = (stringArray: string[]): string[] => {
  return stringArray.map((element) => {
    const words = element.split(' ');
    const capitalizedWords = words.map((word) => {
      if (word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
    return capitalizedWords.join(' ');
  });
};

export const getComoboxEnumOptions = (options?: ComboboxItem[], schemaItems?: string[]) => {
  return (
    options ??
    schemaItems?.map((val: string): ComboboxItem => {
      const stringValue = String(val);
      return {
        displayName: stringValue,
        key: stringValue,
        value: stringValue,
      };
    })
  );
};

export const getBooleanDropdownOptions = (): DropdownItem[] => {
  return [
    { key: 'true', displayName: 'true', value: true },
    { key: 'false', displayName: 'false', value: false },
  ];
};
