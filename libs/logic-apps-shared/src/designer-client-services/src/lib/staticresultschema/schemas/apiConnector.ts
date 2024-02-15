import type { StaticResultRootSchemaType } from './baseactionresult';
import { HttpStaticResultSchema } from './httpresult';
import type { ManifestParser, Schema, SwaggerParser } from '@microsoft/parsers-logic-apps';
import { ExtensionProperties } from '@microsoft/parsers-logic-apps';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { clone } from '@microsoft/utils-logic-apps';

/**
 * Returns the root schema for a connector operation.
 * @arg {string} operationId - the operation Id.
 * @return {StaticResultRootSchema | undefined} - The root schema for the supported operations. undefined for unsupported operations.
 */
export const getStaticResultSchemaForAPIConnector = (
  operationId: string,
  parser: SwaggerParser | ManifestParser
): Promise<StaticResultRootSchemaType | undefined> => {
  const outputSchema = parser.getOutputSchema(operationId);
  return wrapOutputsSchemaToOperationSchema(outputSchema);
};

/**
 * Wraps the static output schema to the operation schema.
 * @arg {Schema} outputSchema - the operation output schema.
 * @return {StaticResultRootSchemaType} - The root schema for connector operation.
 */
const wrapOutputsSchemaToOperationSchema = (outputSchema: Schema): Promise<StaticResultRootSchemaType> => {
  const schema = clone(HttpStaticResultSchema);
  if (outputSchema) {
    const newSchema = cleanDynamicSchemaParameters(clone(outputSchema));
    schema.properties.outputs.properties.body = newSchema;
  } else {
    schema.properties.outputs.properties.body = {};
  }

  return Promise.resolve(schema);
};

/**
 * Cleans the dynamic parameters and convert it to the any type schema.
 * @arg {Schema} schema - The schema to clean.
 * @return {Schema} - The cleaned schema.
 */
const cleanDynamicSchemaParameters = (schema: OpenAPIV2.SchemaObject): OpenAPIV2.IJsonSchema => {
  if (!schema) {
    return schema;
  }

  const currSchema = schema;
  if (currSchema[ExtensionProperties.DynamicSchema]) {
    return { title: currSchema.title };
  }

  const { properties, additionalProperties, items } = currSchema;

  if (properties) {
    for (const property of Object.keys(properties)) {
      properties[property] = cleanDynamicSchemaParameters(properties[property]);
    }
  }

  if (items) {
    cleanDynamicSchemaParameters(items);
  }

  if (additionalProperties && typeof additionalProperties === 'object') {
    currSchema.additionalProperties = cleanDynamicSchemaParameters(additionalProperties);
  }

  return schema;
};
