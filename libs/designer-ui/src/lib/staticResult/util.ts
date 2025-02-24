import type { StaticResultRootSchemaType } from '.';
import constants from '../constants';
import type { DropdownItem } from '../dropdown';
import type { ValueSegment } from '../editor';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import { SchemaPropertyValueType } from './propertyEditor/PropertyEditorItem';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { capitalizeFirstLetter } from '@microsoft/logic-apps-shared';

export const parseStaticResultSchema = (staticResultSchema: any) => {
  const { additionalProperties, properties, required, type } = staticResultSchema;
  return {
    additionalProperties,
    properties,
    required,
    type,
  };
};

export const serializePropertyValues = (
  propertyValues: OpenAPIV2.SchemaObject,
  staticResultSchema: OpenAPIV2.SchemaObject
): OpenAPIV2.SchemaObject => {
  const serializedProperty: OpenAPIV2.SchemaObject = {};
  Object.entries(staticResultSchema.properties ?? {}).forEach(([schemaPropertyName, schemaPropertyValue]) => {
    if (propertyValues[schemaPropertyName] && staticResultSchema.properties?.[schemaPropertyName]) {
      if (schemaPropertyValue.type === constants.SWAGGER.TYPE.OBJECT) {
        const serializedPropertyValue = serializePropertyValues(propertyValues[schemaPropertyName], schemaPropertyValue);
        if (serializedPropertyValue && Object.keys(serializedPropertyValue).length > 0) {
          serializedProperty[schemaPropertyName] = serializedPropertyValue;
        }
      } else if (schemaPropertyValue.type === constants.SWAGGER.TYPE.ARRAY) {
        const serializedPropertyValue = serializePropertyValuesAsArray(propertyValues[schemaPropertyName], schemaPropertyValue);
        if (serializedPropertyValue && serializedPropertyValue.length > 0) {
          serializedProperty[schemaPropertyName] = serializedPropertyValue;
        }
      } else {
        serializedProperty[schemaPropertyName] = propertyValues[schemaPropertyName];
      }
    } else if (!propertyValues[schemaPropertyName] && staticResultSchema.required?.includes(schemaPropertyName)) {
      serializedProperty[schemaPropertyName] = staticResultSchema.properties?.[schemaPropertyName].default;
    }
  });
  if (!staticResultSchema.properties && propertyValues) {
    return propertyValues;
  }
  return serializedProperty;
};

export const serializePropertyValuesAsArray = (
  propertyValues: OpenAPIV2.SchemaObject,
  staticResultSchema: OpenAPIV2.SchemaObject
): OpenAPIV2.SchemaObject[] => {
  const serializedProperty: OpenAPIV2.SchemaObject[] = [];
  const schemaProperties = staticResultSchema?.items?.properties ?? {};
  const schemaEntries = Object.entries(schemaProperties);

  // if the schema does not define properties (this can happen incases of dynamic schema or schema with no properties)
  if (schemaEntries.length === 0) {
    // if the schema is an object, we need to serialize the object properties
    if (staticResultSchema?.items?.type === constants.SWAGGER.TYPE.OBJECT) {
      Object.entries(propertyValues).forEach(([key, value]) => {
        if (value !== undefined) {
          serializedProperty.push({ [key]: value });
        }
      });
    } else {
      serializedProperty.push(...Object.values(propertyValues));
    }

    return serializedProperty;
  }

  // if the schema defines properties
  Object.entries(propertyValues).forEach(([, propertyValue]) => {
    if (typeof propertyValue !== 'object' || propertyValue === null) {
      return;
    }

    const serializedPropertyValue: OpenAPIV2.SchemaObject = {};
    schemaEntries.forEach(([schemaPropertyName, schemaPropertyValue]) => {
      const value = propertyValue[schemaPropertyName];
      if (value !== undefined) {
        if (schemaPropertyValue.type === constants.SWAGGER.TYPE.ARRAY && schemaPropertyValue.items) {
          const serializedArrayValue = serializePropertyValuesAsArray(value, schemaPropertyValue);
          if (serializedArrayValue.length > 0) {
            serializedPropertyValue[schemaPropertyName] = serializedArrayValue;
          }
        } else {
          serializedPropertyValue[schemaPropertyName] = value;
        }
      }
    });

    if (Object.keys(serializedPropertyValue).length > 0) {
      serializedProperty.push(serializedPropertyValue);
    }
  });

  return serializedProperty;
};

export const deserializePropertyValues = (
  propertyValues: OpenAPIV2.SchemaObject,
  staticResultSchema: OpenAPIV2.SchemaObject
): OpenAPIV2.SchemaObject => {
  const deserializedProperty: OpenAPIV2.SchemaObject = {};
  Object.entries(staticResultSchema.properties ?? {}).forEach(([schemaPropertyName, schemaPropertyValue]) => {
    if (propertyValues[schemaPropertyName] && schemaPropertyValue) {
      if (schemaPropertyValue.type === constants.SWAGGER.TYPE.OBJECT) {
        const deserializedPropertyValue = deserializePropertyValues(propertyValues[schemaPropertyName], schemaPropertyValue);
        if (deserializedPropertyValue && Object.keys(deserializedPropertyValue).length > 0) {
          deserializedProperty[schemaPropertyName] = deserializedPropertyValue;
        }
      } else if (schemaPropertyValue.type === constants.SWAGGER.TYPE.ARRAY && schemaPropertyValue.items) {
        const deserializedArrayProperty: OpenAPIV2.SchemaObject = {};
        propertyValues[schemaPropertyName].forEach((propertyValue: OpenAPIV2.SchemaObject, i: number) => {
          const deserializedPropertyValue = deserializePropertyValues(propertyValue, schemaPropertyValue.items as OpenAPIV2.SchemaObject);
          if (schemaPropertyValue.items?.title) {
            deserializedArrayProperty[`${schemaPropertyValue.items.title} - ${i}`] = deserializedPropertyValue;
          } else {
            deserializedArrayProperty[`Item - ${i + 1}`] = deserializedPropertyValue;
          }
        });
        if (deserializedArrayProperty && Object.keys(deserializedArrayProperty).length > 0) {
          deserializedProperty[schemaPropertyName] = deserializedArrayProperty;
        }
      } else {
        deserializedProperty[schemaPropertyName] = propertyValues[schemaPropertyName];
      }
    }
  });
  if (!staticResultSchema.properties && propertyValues) {
    return propertyValues;
  }
  return deserializedProperty;
};

export const initializeShownProperties = (
  required: string[],
  propertiesSchema: StaticResultRootSchemaType,
  propertyValues?: OpenAPIV2.SchemaObject
): Record<string, boolean> => {
  const shownProperties: Record<string, boolean> = {};
  Object.keys(propertiesSchema).forEach((propertyName) => {
    shownProperties[propertyName] = required.indexOf(propertyName) > -1 || propertyValues?.[propertyName];
  });
  return shownProperties;
};

export const formatShownProperties = (propertiesSchema: Record<string, boolean>): ValueSegment[] => {
  if (!propertiesSchema) {
    return [];
  }
  const filteredProperties: Record<string, boolean> = Object.fromEntries(Object.entries(propertiesSchema).filter(([, value]) => value));
  return [createLiteralValueSegment(Object.keys(filteredProperties).toString())];
};

export const getOptions = (propertiesSchema: StaticResultRootSchemaType, required: string[]): DropdownItem[] => {
  const options: DropdownItem[] = [];
  if (propertiesSchema) {
    Object.keys(propertiesSchema).forEach((propertyName) => {
      options.push({
        key: propertyName,
        value: propertyName,
        displayName: `${capitalizeFirstLetter(propertyName)}`,
        disabled: required.includes(propertyName),
      });
    });
  }
  return options;
};

export const initializeCheckedDropdown = (
  propertyValue: OpenAPIV2.SchemaObject | string,
  propertyType: SchemaPropertyValueType
): Record<string, boolean> => {
  if (propertyType === SchemaPropertyValueType.STRING) {
    return {};
  }
  const returnDropdown: Record<string, boolean> = {};

  Object.keys(propertyValue).forEach((propertyValueKey) => {
    returnDropdown[propertyValueKey] = true;
  });
  return returnDropdown;
};

export const initializePropertyValueText = (
  propertyValue: OpenAPIV2.SchemaObject | string,
  propertyType: SchemaPropertyValueType
): string => {
  if (propertyType === SchemaPropertyValueType.OBJECT) {
    return '';
  }
  return propertyValue as string;
};

export const initializePropertyValueInput = (
  currProperties: OpenAPIV2.SchemaObject,
  schema: StaticResultRootSchemaType | OpenAPIV2.SchemaObject
): string => {
  const inputVal = (
    typeof currProperties === 'string' || typeof currProperties === 'number' || typeof currProperties === 'boolean'
      ? currProperties
      : Object.keys(currProperties).length > 0
        ? JSON.stringify(currProperties, null, 2)
        : (schema?.default ?? '')
  ) as string;
  return inputVal;
};
