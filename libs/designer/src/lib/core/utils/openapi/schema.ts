import { ExtensionProperties as SwaggerExtensionProperties } from '@microsoft/parsers-logic-apps';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';

export const getTitleOrSummary = (schema: OpenAPIV2.SchemaObject): string | undefined => {
  if (!schema) {
    return undefined;
  }

  return schema.title || schema[SwaggerExtensionProperties.Summary];
};

export const isOneOf = (schema: OpenAPIV2.SchemaObject): boolean => {
  return !!schema?.oneOf;
};
