import type { ManifestParser, OpenApiSchema, SwaggerParser } from '../../../../parsers';
import { ExtensionProperties } from '../../../../parsers';
import type { OpenAPIV2 } from '../../../../utils/src';
import { clone } from '../../../../utils/src';
import type { StaticResultRootSchemaType } from './baseactionresult';
import { HttpStaticResultSchema } from './httpresult';

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
  console.log('[DEBUG StaticResult] getStaticResultSchemaForAPIConnector called', {
    operationId,
    parserType: parser.constructor.name,
    outputSchema: JSON.stringify(outputSchema, null, 2),
  });
  return wrapOutputsSchemaToOperationSchema(outputSchema);
};

/**
 * Wraps the static output schema to the operation schema.
 * @arg {OpenApiSchema} outputSchema - the operation output schema.
 * @return {StaticResultRootSchemaType} - The root schema for connector operation.
 */
const wrapOutputsSchemaToOperationSchema = (outputSchema: OpenApiSchema): Promise<StaticResultRootSchemaType> => {
  const schema = clone(HttpStaticResultSchema);
  if (outputSchema) {
    const newSchema = cleanDynamicSchemaParameters(clone(outputSchema));
    schema.properties.outputs.properties.body = newSchema;
    console.log('[DEBUG StaticResult] wrapOutputsSchemaToOperationSchema', {
      originalOutputSchema: JSON.stringify(outputSchema, null, 2),
      cleanedSchema: JSON.stringify(newSchema, null, 2),
      finalBodySchema: JSON.stringify(schema.properties.outputs.properties.body, null, 2),
    });
  } else {
    schema.properties.outputs.properties.body = {};
    console.log('[DEBUG StaticResult] wrapOutputsSchemaToOperationSchema - no outputSchema, using empty body');
  }

  console.log('[DEBUG StaticResult] Final wrapped schema', {
    schemaKeys: Object.keys(schema.properties),
    outputsKeys: Object.keys(schema.properties.outputs.properties),
  });

  return Promise.resolve(schema);
};

/**
 * Cleans the dynamic parameters and convert it to the any type schema.
 * @arg {OpenApiSchema} schema - The schema to clean.
 * @return {OpenApiSchema} - The cleaned schema.
 */
const cleanDynamicSchemaParameters = (schema: OpenAPIV2.SchemaObject): OpenAPIV2.IJsonSchema => {
  if (!schema) {
    return schema;
  }

  const currSchema = schema;
  if (currSchema[ExtensionProperties.DynamicSchema]) {
    console.log('[DEBUG StaticResult] cleanDynamicSchemaParameters - found dynamic schema, stripping to title only', {
      title: currSchema.title,
    });
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
