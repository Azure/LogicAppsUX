import type { OutputMetadata, OutputParameter, SchemaProperty } from '../models/operation';
import { OutputSource, ParameterLocations, ResponseCodes } from './constants';
import * as ParameterKeyUtility from './helpers/keysutility';
import { getArrayOutputMetadata } from './helpers/utils';
import type { SchemaProcessorOptions, Schema } from './schemaprocessor';
import { SchemaProcessor } from './schemaprocessor';
import { equals, startsWith } from '@microsoft-logic-apps/utils';

export type Responses = OpenAPIV2.ResponsesObject;

export class OutputsProcessor {
  private _options: SchemaProcessorOptions;
  private _responses: Responses;

  constructor(responses: Responses, options: SchemaProcessorOptions = {}) {
    this._options = options;
    this._responses = responses;
  }

  getTargetSchema(): Schema {
    const response = this._getResponse();
    return response.schema;
  }

  getOutputs(): OutputParameter[] {
    const response = this._getResponse();
    const schema = response.schema || {};
    const headers = response.headers || {};
    const processor = new SchemaProcessor(this._options);

    const bodySchemaProperties: SchemaProperty[] = processor.getSchemaProperties(schema);
    const bodyOutputParameters = bodySchemaProperties.map((schemaProperty) => {
      return OutputsProcessor.convertSchemaPropertyToOutputParameter(schemaProperty, OutputSource.Body, ParameterLocations.Body);
    });

    let allheaderOutputParameters: OutputParameter[] = [];
    Object.keys(headers).forEach((key) => {
      const processorOption = { ...this._options, keyPrefix: ParameterKeyUtility.create(['$', key]) };
      const childProcessor = new SchemaProcessor(processorOption); // TODO(tonytang): header object is not schema. Use HeadersProcessor to process it.
      const headerSchemaProperties = childProcessor.getSchemaProperties(headers[key]);
      const headerOutputParameters = headerSchemaProperties.map((schemaProperty) => {
        return OutputsProcessor.convertSchemaPropertyToOutputParameter(
          schemaProperty,
          OutputSource.Headers,
          ParameterLocations.Header,
          key
        );
      });

      allheaderOutputParameters = allheaderOutputParameters.concat(headerOutputParameters);
    });

    return bodyOutputParameters.concat(allheaderOutputParameters);
  }

  getOutputMetadata(): OutputMetadata {
    const response = this._getResponse();
    return getArrayOutputMetadata(response.schema || {}, /* required */ true, this._options.excludeInternal as boolean);
  }

  // TODO(johnwa): this method should move to some utility class.
  public static convertSchemaPropertyToOutputParameter(
    schemaProperty: SchemaProperty,
    outputSource: string,
    parameterLocation: string,
    name?: string
  ): OutputParameter {
    const outputParameter = { ...schemaProperty };

    outputParameter.source = outputSource;
    outputParameter.key = `${parameterLocation}.${schemaProperty.key}`; // TODO(tonytang): Use ParameterKeyUtility to create the key.

    if (name) {
      outputParameter.name = name;
    }

    return outputParameter;
  }

  private _getResponse() {
    const responses = this._responses;
    const responseCodes = Object.keys(responses);
    const responsesLength = responseCodes.length;
    const responseCode = responsesLength > 0 ? responseCodes[0] : '';

    // NOTE(shimedh): If only one response is defined in the swagger and if it is any of the assigned success response codes or default, then we return the response.
    //       Else if more than one responses defined in the swagger, then, we keep the current behavior (if 200, else if default, else empty)
    if (
      responsesLength === 1 &&
      (equals(responseCode, ResponseCodes.$default) ||
        (startsWith(responseCode, '2') && responseCodes.some((code) => equals(responseCode, code))))
    ) {
      return responses[responseCode];
    } else {
      if (responses[ResponseCodes.$200]) {
        return responses[ResponseCodes.$200];
      } else if (responses[ResponseCodes.$201]) {
        return responses[ResponseCodes.$201];
      } else if (responses[ResponseCodes.$default]) {
        return responses[ResponseCodes.$default];
      } else {
        return {};
      }
    }
  }
}
