/* eslint-disable no-case-declarations */
import * as Constants from '../common/constants';
import { create, encodePropertySegment } from '../common/helpers/keysutility';
import { getEnum, getParameterDynamicSchema, getParameterDynamicValues, toSwaggerSchema } from '../common/helpers/utils';
import { SchemaProcessor } from '../common/schemaprocessor';
import type { InputParameter, InputParameters } from '../models/operation';
import { toInputParameter } from '../models/operation';
import type { KeyProjectionOptions } from './parser';
import { getIntl } from '@microsoft-logic-apps/intl';
import { aggregate, equals, includes, map } from '@microsoft-logic-apps/utils';

export interface ParametersProcessorOptions {
  excludeAdvanced?: boolean;
  excludeInternal?: boolean;
  expandArray?: boolean;
  expandArrayDepth?: number;
  includeParentObject?: boolean;
}
type Parameter = OpenAPIV2.Parameter;

export class ParametersProcessor {
  constructor(private parameters: Parameter[] = [], private options: ParametersProcessorOptions = {}) {
    this.options = {
      excludeAdvanced: false,
      excludeInternal: true,
      includeParentObject: false,
      ...options,
    };

    const sortedParameters: Parameter[] = [];

    parameters.forEach((parameter) => {
      if (parameter.required) {
        sortedParameters.push(parameter);
      }
    });

    parameters.forEach((parameter) => {
      if (!parameter.required && equals(parameter[Constants.ExtensionProperties.Visibility], Constants.Visibility.Important)) {
        sortedParameters.push(parameter);
      }
    });

    parameters.forEach((parameter) => {
      if (
        !parameter.required &&
        !equals(parameter[Constants.ExtensionProperties.Visibility], Constants.Visibility.Important) &&
        !equals(parameter[Constants.ExtensionProperties.Visibility], Constants.Visibility.Advanced)
      ) {
        sortedParameters.push(parameter);
      }
    });

    parameters.forEach((parameter) => {
      if (
        !parameter.required &&
        !equals(parameter[Constants.ExtensionProperties.Visibility], Constants.Visibility.Important) &&
        equals(parameter[Constants.ExtensionProperties.Visibility], Constants.Visibility.Advanced)
      ) {
        sortedParameters.push(parameter);
      }
    });

    this.parameters = sortedParameters;
  }

  getParameters(keyProjectionOption: KeyProjectionOptions = {}): InputParameters {
    const parameters = this.parameters.map((parameter) => this._getParameters(parameter, keyProjectionOption)),
      allParameters = aggregate(parameters)
        .filter((parameter) => !this.isReservedParameter(parameter))
        .filter((parameter) => !(this.options.excludeInternal && equals(parameter.visibility, Constants.Visibility.Internal)))
        .filter((parameter) => !(this.options.excludeAdvanced && equals(parameter.visibility, Constants.Visibility.Advanced)));

    return {
      byId: map(allParameters, 'key'), // TODO: key should not be used as id when we support multiple items in array.
      byName: map(allParameters, 'name'),
    };
  }

  isReservedParameter(parameter: InputParameter): boolean {
    return (
      equals(parameter.name, Constants.ReservedParameterNames.ConnectionId) &&
      !!parameter.required &&
      equals(parameter.in, Constants.ParameterLocations.Path) &&
      equals(parameter.visibility, Constants.Visibility.Internal) &&
      parameter.type === 'string'
    );
  }

  hasAdvancedParameters(): boolean {
    const parameters = aggregate(this.parameters.map((parameter) => this._getParameters(parameter)));

    return parameters.some((parameter) => equals(parameter.visibility, Constants.Visibility.Advanced));
  }

  private _getParameters(parameter: Parameter, keyProjectionOption: KeyProjectionOptions = {}): InputParameter[] {
    const { in: location, schema, required } = parameter;
    let type = parameter.type;

    switch (location) {
      case Constants.ParameterLocations.Body:
        type = parameter.schema.type;

        switch (type) {
          case Constants.Types.Array:
            const processor = new SchemaProcessor({
              prefix: parameter.name ? encodePropertySegment(parameter.name) : undefined,
              isInputSchema: true,
              expandArrayOutputs: !!this.options.expandArray,
              expandArrayOutputsDepth: this.options.expandArrayDepth,
              keyPrefix: create(this._getMergedKeySegments(location, keyProjectionOption)),
              excludeAdvanced: this.options.excludeAdvanced,
              excludeInternal: this.options.excludeInternal,
              includeParentObject: this.options.includeParentObject,
              parentProperty: {
                visibility: parameter[Constants.ExtensionProperties.Visibility],
              },
              required,
              isNested: false,
            });

            const inputs = processor.getSchemaProperties(schema);
            return inputs.map((item) => ({ ...toInputParameter(item), in: location }));

          case Constants.Types.Boolean:
          case Constants.Types.Integer:
          case Constants.Types.Null:
          case Constants.Types.Number:
          case Constants.Types.String:
            return [this._getParameterFromSchema(parameter, keyProjectionOption)];

          case Constants.Types.Object:
            const hasDynamicSchema = schema[Constants.ExtensionProperties.DynamicSchema];
            let parameters: InputParameter[] = [];
            if (Object.keys(schema.properties || {}).length || hasDynamicSchema) {
              const processor = new SchemaProcessor({
                  prefix: hasDynamicSchema ? encodePropertySegment(parameter.name) : undefined,
                  keyPrefix: create(this._getMergedKeySegments(location, keyProjectionOption)),
                  isInputSchema: true,
                  expandArrayOutputs: !!this.options.expandArray,
                  expandArrayOutputsDepth: this.options.expandArrayDepth,
                  required: parameter.required,
                  excludeAdvanced: this.options.excludeAdvanced,
                  excludeInternal: this.options.excludeInternal,
                  includeParentObject: this.options.includeParentObject,
                }),
                schemaProperties = processor.getSchemaProperties(schema);

              parameters = schemaProperties.map((schemaProperty) => ({ ...toInputParameter(schemaProperty), in: location }));
            }

            return parameters.length ? parameters : [this._getParameterFromSchema(parameter, keyProjectionOption)];

          default:
            return [{ ...this._getParameterFromSchema(parameter, keyProjectionOption), type: Constants.Types.Any }];
        }

      case Constants.ParameterLocations.FormData:
        switch (type) {
          case Constants.Types.Boolean:
          case Constants.Types.Integer:
          case Constants.Types.Number:
          case Constants.Types.String:
            return [
              this._getScalarParameter(
                parameter,
                create(this._getMergedKeySegments(location, keyProjectionOption, parameter.name)),
                keyProjectionOption
              ),
            ];

          case Constants.Types.File:
            return this._getFileParameters(parameter, keyProjectionOption);
          default:
            return [];
        }
      case Constants.ParameterLocations.Header:
      case Constants.ParameterLocations.Path:
      case Constants.ParameterLocations.Query:
        switch (type) {
          case Constants.Types.Array:
          case Constants.Types.Boolean:
          case Constants.Types.File:
          case Constants.Types.Integer:
          case Constants.Types.Number:
          case Constants.Types.String:
            return [this._getScalarParameter(parameter, /* key */ undefined, keyProjectionOption)];

          default:
            return [];
        }

      default:
        return [];
    }
  }

  private _getParameterFromSchema(parameter: Parameter, keyProjectionOption: KeyProjectionOptions = {}): InputParameter {
    const schema = parameter.schema;
    return {
      ...this._getScalarParameter(parameter, create(this._getMergedKeySegments(parameter.in, keyProjectionOption))),
      default: schema.default,
      enum: getEnum(schema, parameter.required),
      type: schema.type,
      format: schema.format,
      itemSchema: schema.items,
      schema,
      permission: schema[Constants.ExtensionProperties.Permission],
      dynamicSchema: getParameterDynamicSchema(parameter as OpenAPIV2.SchemaObject),
    };
  }

  private _getScalarParameter(parameter: Parameter, key?: string, keyProjectionOption: KeyProjectionOptions = {}): InputParameter {
    const $default = parameter.default,
      description = parameter.description,
      editor = parameter[Constants.ExtensionProperties.Editor],
      editorOptions = parameter[Constants.ExtensionProperties.EditorOptions],
      encode = parameter[Constants.ExtensionProperties.Encode],
      $enum = getEnum(parameter as OpenAPIV2.SchemaObject, parameter.required),
      format = parameter.format,
      $in = parameter.in,
      name = encodePropertySegment(parameter.name),
      recommended = parameter[Constants.ExtensionProperties.SchedulerRecommendation],
      required = !!parameter.required,
      summary = parameter[Constants.ExtensionProperties.Summary],
      schema = toSwaggerSchema(parameter),
      type = parameter.type,
      visibility = parameter[Constants.ExtensionProperties.Visibility];

    return {
      key: key ?? (create([...this._getMergedKeySegments($in, keyProjectionOption), name]) as string),
      default: $default,
      description,
      dynamicValues: getParameterDynamicValues(parameter as OpenAPIV2.SchemaObject),
      editor,
      editorOptions,
      encode,
      enum: $enum,
      format,
      in: $in,
      name,
      recommended,
      required,
      schema,
      summary,
      type,
      visibility,
    };
  }

  // NOTE: For file type form data parameter, if x-ms-format is not 'contentOnly', we show two input parameters.
  // One for the content, and one for the file name inside Content-Disposition header.
  //
  // TODO: Consider revisit UI to match the definition, thus given user ability
  // to edit every data that is editable via code view.
  private _getFileParameters(parameter: Parameter, keyProjectionOption: KeyProjectionOptions = {}): InputParameter[] {
    // NOTE: We filter out the parameter whose name contains double quote.
    // It conflicts with the delimeter in Content-Disposition header.
    if (includes(parameter.name, '"')) {
      return [];
    }

    // TODO: @ has special meaning in workflow definition, thus filter it out for now.
    if (includes(parameter.name, '@')) {
      return [];
    }

    const fileContent = this._getScalarParameter(
      parameter,
      create([...this._getMergedKeySegments(parameter.in, keyProjectionOption, parameter.name), '$content'])
    );
    if (parameter[Constants.ExtensionProperties.Format] === Constants.Formats.ContentOnly) {
      return [fileContent];
    } else {
      const intl = getIntl();
      const fileName = {
        key: create([...this._getMergedKeySegments(parameter.in, keyProjectionOption, parameter.name), '$filename']) as string,
        in: Constants.ParameterLocations.FormData,
        name: parameter.name,
        description: undefined,
        type: Constants.Types.String,
        format: undefined,
        required: false,
        default: undefined,
        enum: undefined,
        dynamicValues: undefined,
        editor: parameter[Constants.ExtensionProperties.Editor],
        editorOptions: parameter[Constants.ExtensionProperties.EditorOptions],
        recommended: undefined,
        summary: intl.formatMessage(
          { defaultMessage: '{fileName} (file name)', description: 'Title for file name parameter' },
          { fileName: parameter[Constants.ExtensionProperties.Summary] }
        ),
        visibility: undefined,
        options: {
          forceStringInterpolation: true,
        },
      };
      return [fileContent, fileName];
    }
  }

  private _getMergedKeySegments($in: string, keyProjectionOption: KeyProjectionOptions = {}, parameterName?: string): string[] {
    const keyPrefix = keyProjectionOption.keyPrefix || [];

    const keySubPrefix = (keyProjectionOption.locationToKeySegmentsMap && keyProjectionOption.locationToKeySegmentsMap[$in]) || [$in];

    const keySegments = [...keyPrefix, ...keySubPrefix, ...(keyPrefix.length > 0 ? [] : ['$'])];
    return parameterName ? [...keySegments, parameterName] : keySegments;
  }
}
