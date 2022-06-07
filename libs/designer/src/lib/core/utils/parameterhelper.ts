import Constants from '../../common/constants';
import { initializeArrayViewModel } from './editors/array';
import type { InputParameter, ResolvedParameter, SchemaProcessorOptions, SchemaProperty, Segment } from '@microsoft-logic-apps/parsers';
import {
  createEx,
  decodePropertySegment,
  DefaultKeyPrefix,
  encodePropertySegment,
  isAncestorKey,
  isTemplateExpression,
  parseEx,
  SchemaProcessor,
  SegmentType,
  Visibility,
} from '@microsoft-logic-apps/parsers';
import {
  clone,
  equals,
  first,
  format,
  getPropertyValue,
  guid,
  isNullOrUndefined,
  isObject,
  ValidationErrorCode,
  ValidationException,
} from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';

export const ParameterGroupKeys = {
  DEFAULT: 'default',
  RECURRENCE: 'recurrence',
};

export interface RepetitionContext {
  splitOn?: string;
  repetitionReferences: RepetitionReference[];
}

export interface RepetitionReference {
  actionName: string;
  actionType: string;
  repetitionValue: any; // NOTE: the expression for foreach, and its type could be string or array.
  repetitionStep?: string; // NOTE: the output original step
  repetitionPath?: string; // NOTE: the full output path for repetition value if it coming from output
}

/**
 * Converts to parameter info map.
 * @arg {string} nodeType - The type of the node.
 * @arg {InputParameter[]} inputParameters - The input parameters.
 * @arg {any} [stepDefinition] - The step definition.
 * @arg {string} [nodeId] - The graph node id which contains the specified parameters.
 */
export function toParameterInfoMap(
  nodeType: string,
  inputParameters: InputParameter[],
  stepDefinition?: any,
  nodeId?: string
): ParameterInfo[] {
  const metadata = stepDefinition && stepDefinition.metadata;
  const result: ParameterInfo[] = [];

  for (const inputParameter of inputParameters) {
    let repetitionContext: RepetitionContext | null;
    if (nodeId) {
      repetitionContext = null; // TODO: Get repetition context from redux for this node
    } else {
      repetitionContext = null;
    }

    if (!inputParameter.dynamicSchema) {
      const parameter = createParameterInfo(inputParameter, repetitionContext, metadata);
      result.push(parameter);
    }
  }

  return result;
}

/**
 * Gets the parameter info object for UI elements from the resolved parameters from schema, swagger, definition, etc.
 * @arg {InputParameter} parameter - An object with metadata about a Swagger input parameter.
 * @arg {RepetitionContext} repetitionContext - An object contains the repetition related context data.
 * @arg {Record<string, string>} [metadata] - A hash mapping dynamic value lookup values to their display strings.
 * @arg {boolean} [shouldIgnoreDefaultValue=false] - True if should not populate with default value of dynamic parameter.
 * @return {ParameterInfo} - An object with the view model for an input parameter field.
 */
export function createParameterInfo(
  parameter: ResolvedParameter,
  repetitionContext?: RepetitionContext | null,
  metadata?: Record<string, string>,
  shouldIgnoreDefaultValue = false
): ParameterInfo {
  if (!repetitionContext) {
    // eslint-disable-next-line no-param-reassign
    repetitionContext = {
      repetitionReferences: [],
    };
  }

  const editor = getParameterEditorProps(parameter, shouldIgnoreDefaultValue);
  const parameterInfo: ParameterInfo = {
    alternativeKey: parameter.alternativeKey,
    id: guid(),
    editor: editor.type,
    editorOptions: editor.options,
    info: {
      alias: parameter.alias,
      encode: parameter.encode,
      format: parameter.format,
      in: parameter.in,
      isDynamic: !!parameter.isDynamic,
      isUnknown: parameter.isUnknown,
    },
    hideInUI: parameter.invisible,
    label: parameter.title || parameter.summary || parameter.name,
    parameterKey: parameter.key,
    parameterName: parameter.name,
    placeholder: parameter.description,
    preservedValue: getPreservedValue(parameter),
    required: !!parameter.required,
    schema: editor.schema,
    showErrors: false,
    showTokens: false,
    suppressCasting: parameter.suppressCasting,
    type: parameter.type,
    value: loadParameterValue(parameter),
    viewModel: editor.viewModel,
    visibility: parameter.visibility,
  };

  return parameterInfo;
}

export function getParameterEditorProps(inputParameter: InputParameter, shouldIgnoreDefaultValue = false): ParameterEditorProps {
  let type = inputParameter.editor;
  let editorViewModel;
  let schema = inputParameter.schema;

  if (
    !type &&
    inputParameter.type === Constants.SWAGGER.TYPE.ARRAY &&
    !!inputParameter.itemSchema &&
    !equals(inputParameter.visibility, Visibility.Internal)
  ) {
    type = Constants.EDITOR.ARRAY;
    editorViewModel = initializeArrayViewModel(inputParameter, shouldIgnoreDefaultValue);
    schema = { ...schema, ...{ 'x-ms-editor': Constants.EDITOR.ARRAY } };
  }

  return {
    type,
    options: inputParameter.editorOptions,
    viewModel: editorViewModel,
    schema,
  };
}

interface ParameterEditorProps {
  type?: string;
  options?: Record<string, any>;
  viewModel?: any;
  schema: any;
}

export function shouldIncludeSelfForRepetitionReference(graphNodeType: string, parameterName?: string): boolean {
  if (
    equals(graphNodeType, Constants.NODE.TYPE.QUERY) ||
    equals(graphNodeType, Constants.NODE.TYPE.SELECT) ||
    equals(graphNodeType, Constants.NODE.TYPE.TABLE)
  ) {
    return !parameterName || parameterName !== 'from';
  }

  return false;
}

// TODO - Update the method to return value segments once its data structure is determined.
export function loadParameterValue(parameter: InputParameter): any {
  return parameter.isNotificationUrl ? `@${Constants.HTTP_WEBHOOK_LIST_CALLBACK_URL_NAME}` : parameter.value;
}

function getPreservedValue(parameter: InputParameter): any {
  return shouldUseCsvValue(parameter) && Array.isArray(parameter.value)
    ? parameter.value.join(Constants.RECURRENCE_TITLE_JOIN_SEPARATOR)
    : parameter.value;
}

function shouldUseCsvValue(parameter: InputParameter): boolean {
  return !!parameter.editorOptions && !!parameter.editorOptions.csvValue;
}

export function loadParameterValuesFromDefault(inputParameters: Record<string, InputParameter>): void {
  for (const indexKey of Object.keys(inputParameters)) {
    const inputParameter = inputParameters[indexKey];
    if (inputParameter.default !== undefined) {
      inputParameter.value = inputParameter.default;
    }
  }
}

export function updateParameterWithValues(
  parameterKey: string,
  parameterValue: any,
  parameterLocation: string,
  availableInputParameters: InputParameter[],
  createInvisibleParameter = true,
  useDefault = true
): InputParameter[] {
  const parameters: InputParameter[] = [];
  let inputParameter = first((parameter) => parameter.key === parameterKey, availableInputParameters);

  const clonedParameterValue =
    typeof parameterValue === 'object' && !Array.isArray(parameterValue) ? clone(parameterValue) : parameterValue;

  if (isNullOrUndefined(clonedParameterValue) && useDefault) {
    // assign the default value to input parameter
    parameters.push(...availableInputParameters.map((parameter) => transformInputParameter(parameter, parameter.default)));
  } else {
    if (Array.isArray(clonedParameterValue) && clonedParameterValue.length !== 1 && inputParameter) {
      // if inputParameter type is array, and the value is also array, but it contains more than one item
      // just assign the array value to input directly
      parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
    } else {
      const keySegments = parseEx(parameterKey);
      const descendantInputParameters = availableInputParameters.filter((item) => isAncestorKey(item.key, parameterKey));

      if (descendantInputParameters.length > 0) {
        if (isNullOrUndefined(clonedParameterValue)) {
          parameters.push(
            ...descendantInputParameters.map((parameter) => transformInputParameter(parameter, /* parameterValue */ undefined))
          );
        } else {
          const valueExpandable =
            isObject(clonedParameterValue) || (Array.isArray(clonedParameterValue) && clonedParameterValue.length === 1);
          if (valueExpandable) {
            for (const descendantInputParameter of descendantInputParameters) {
              const extraSegments = getExtraSegments(descendantInputParameter.key, parameterKey);
              const descendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, extraSegments);
              let alternativeParameterKeyExtraSegment: Segment[] | null = null;

              if (descendantInputParameter.alternativeKey) {
                alternativeParameterKeyExtraSegment = getExtraSegments(descendantInputParameter.alternativeKey, parameterKey);
                const alternativeParameterKeyDescendantValue = getPropertyValueWithSpecifiedPathSegments(
                  clonedParameterValue,
                  alternativeParameterKeyExtraSegment
                );
                if (alternativeParameterKeyDescendantValue !== descendantValue) {
                  throw new ValidationException(
                    ValidationErrorCode.UNSPECIFIED,
                    format(
                      "The value '{0}' in '{1}' section and value '{2}' in '{3}' section should match.",
                      descendantValue,
                      descendantInputParameter.key.replace('$.', ''),
                      alternativeParameterKeyDescendantValue,
                      descendantInputParameter.alternativeKey.replace('$.', '')
                    )
                  );
                }
              }

              parameters.push(transformInputParameter(descendantInputParameter, descendantValue, /* invisible */ false));
              deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, extraSegments);
              if (alternativeParameterKeyExtraSegment) {
                deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, alternativeParameterKeyExtraSegment);
              }
            }

            // for the rest properties, create corresponding invisible parameter to preserve the value when serialize
            if (createInvisibleParameter) {
              for (const restPropertyName of Object.keys(clonedParameterValue)) {
                const propertyValue = clonedParameterValue[restPropertyName];
                if (propertyValue !== undefined) {
                  const childKeySegments = [...keySegments, { value: restPropertyName, type: SegmentType.Property }];
                  const restInputParameter: ResolvedParameter = {
                    key: createEx(childKeySegments) as string,
                    name: restPropertyName,
                    type: Constants.SWAGGER.TYPE.ANY,
                    in: parameterLocation,
                    required: false,
                    isUnknown: true,
                  };

                  parameters.push(transformInputParameter(restInputParameter, propertyValue, /* invisible */ false));
                }
              }
            }
          } else {
            // NOTE: the value is not expandable, we should create a raw input for the specified parameterKey
            // if the input parameter is not exist, then create the corresponding input parameter with specified key
            if (inputParameter) {
              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            } else {
              const segments = parseEx(parameterKey);
              const lastSegment = segments[segments.length - 1];
              const required = descendantInputParameters.some((item) => item.required);
              let name: string = lastSegment.value as string;
              let summary = name;

              if (lastSegment.value === '$' && lastSegment.type === SegmentType.Property) {
                name = parameterLocation;
                summary = 'Raw inputs';
              }

              inputParameter = {
                key: parameterKey,
                name,
                type: Constants.SWAGGER.TYPE.OBJECT,
                summary,
                in: parameterLocation,
                required,
              };

              parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
            }
          }
        }
      } else {
        let invisible = false;
        if (!inputParameter && createInvisibleParameter) {
          invisible = true;
        }

        if (inputParameter) {
          parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
        } else {
          const segments = parseEx(parameterKey);
          const lastSegment = segments[segments.length - 1];
          if (
            lastSegment.value === '$' &&
            lastSegment.type === SegmentType.Property &&
            typeof clonedParameterValue === Constants.SWAGGER.TYPE.OBJECT &&
            Object.keys(clonedParameterValue).length > 0
          ) {
            // expand the object
            for (const propertyName of Object.keys(clonedParameterValue)) {
              const childInputParameter = {
                key: createEx([...segments, { type: SegmentType.Property, value: propertyName }]) as string,
                name: propertyName,
                type: Constants.SWAGGER.TYPE.ANY,
                in: parameterLocation,
                required: false,
              };

              parameters.push(transformInputParameter(childInputParameter, clonedParameterValue[propertyName], invisible));
            }
          } else {
            inputParameter = {
              key: parameterKey,
              name: lastSegment.value as string,
              type: Constants.SWAGGER.TYPE.ANY,
              in: parameterLocation,
              required: false,
            };

            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
          }
        }
      }
    }
  }

  return parameters;
}

function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive = false): any {
  if (segments.length === 0) {
    return value;
  }

  if (typeof value !== 'object' && !Array.isArray(value)) {
    return undefined;
  }

  const cloneSegments = [...segments];
  const firstSegment = cloneSegments.shift();
  const propertyName = getAndEscapeSegment(firstSegment as Segment);

  let propertyValue: any;
  if (typeof propertyName === 'string') {
    propertyValue = caseSensitive ? value[propertyName] : getPropertyValue(value, propertyName);
  } else {
    propertyValue = value[propertyName];
  }
  return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive = false) {
  let reachEnd = true;
  const cloneSegments = [...segments];
  while (cloneSegments.length > 0) {
    const deleteValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    if (deleteValue === undefined) {
      break;
    }

    const lastSegment = cloneSegments.pop();
    const parentValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
    let propertyName = getAndEscapeSegment(lastSegment as Segment);
    if (!caseSensitive && typeof parentValue === 'object' && typeof propertyName === 'string') {
      for (const key of Object.keys(parentValue)) {
        if (equals(key, propertyName)) {
          propertyName = key;
          break;
        }
      }
    }

    if (reachEnd) {
      reachEnd = false;
      delete parentValue[propertyName];
    } else {
      let ableDelete = true;
      if (typeof deleteValue === 'object' && Object.keys(deleteValue).some((key) => deleteValue[key] !== undefined)) {
        ableDelete = false;
      } else if (Array.isArray(deleteValue) && deleteValue.some((item) => item !== undefined)) {
        ableDelete = false;
      }

      if (ableDelete) {
        delete parentValue[propertyName];
      }
    }
  }
}

export function getAndEscapeSegment(segment: Segment): string | number {
  // NOTE: for property segment, return the property name as key; for index segment, return the index value or 0
  switch (segment.type) {
    case SegmentType.Property:
      return tryConvertStringToExpression(decodePropertySegment(segment.value as string));
    case SegmentType.Index:
      return segment.value || 0;
    default:
      return segment.value as string | number;
  }
}

/**
 * Converts the value to a string that will be evaluated to the original value at runtime.
 * @arg {string} value - The value that the returned string will be evaluated to.
 * @return {string}
 */
export function tryConvertStringToExpression(value: string): string {
  if (isTemplateExpression(value)) {
    if (value.charAt(0) === '@') {
      return `@${value}`;
    } else {
      return value.replace(/@{/g, '@@{');
    }
  } else {
    return value;
  }
}

function getExtraSegments(key: string, ancestorKey: string): Segment[] {
  let childSegments: Segment[] = [];
  let startIndex = 0;

  if (key && ancestorKey) {
    childSegments = parseEx(key);
    const ancestorSegments = parseEx(ancestorKey);
    let ancestorStartIndex = 0;
    if (ancestorSegments.length < childSegments.length) {
      for (startIndex = 0; startIndex < childSegments.length; startIndex++) {
        const childSegment = childSegments[startIndex];
        const ancestorSegment = ancestorSegments[ancestorStartIndex];
        if (childSegment.type === SegmentType.Property && childSegment.value === ancestorSegment.value) {
          ancestorStartIndex++;
        }
        if (ancestorStartIndex === ancestorSegments.length) {
          startIndex++;
          break;
        }
      }
    }
  }

  return childSegments.slice(startIndex);
}

function transformInputParameter(inputParameter: InputParameter, parameterValue: any, invisible = false): InputParameter {
  return { ...inputParameter, invisible, value: parameterValue };
}

/**
 * Check whether the specified value is compatiable with provided schema
 * @arg {any} value - The specified value.
 * @arg {any} schema - The provided schema. If isArray is true, it is the array's item schema, otherwise, it's the object schema
 * @arg {boolean} isArray - The flag to check for an array value.
 * @arg {boolean} shallowArrayCheck - The flag to indicate whether the checking is shallow check only or dive into property or nested item.
 * @return {boolean} - Return true if the value match the schema, otherwise return false.
 */
export function isArrayOrObjectValueCompatibleWithSchema(value: any, schema: any, isArray: boolean, shallowArrayCheck = false): boolean {
  if (isNullOrUndefined(schema)) {
    return false;
  } else if (isNullOrUndefined(value)) {
    return true;
  }

  if (isArray) {
    if (shallowArrayCheck) {
      return Array.isArray(value);
    } else if (!Array.isArray(value)) {
      return false;
    }
  } else if (typeof value !== 'object') {
    return false;
  } else if (!isArray && !Array.isArray(value) && schema.type === Constants.SWAGGER.TYPE.OBJECT && schema.properties === undefined) {
    // NOTE: for schema.additionalProperties as boolean value case, it just ignore the checking and return true.
    if (schema.additionalProperties && schema.additionalProperties.type) {
      return Object.keys(value).every(
        (key) =>
          (typeof value[key] === 'string' && isTemplateExpression(value[key])) ||
          (schema.additionalProperties.type !== 'object' && typeof value[key] === schema.additionalProperties.type) ||
          (schema.additionalProperties.type === 'object' && isObject(value[key])) ||
          (schema.additionalProperties.type === 'array' && Array.isArray(value[key]))
      );
    }

    return true;
  }

  const schemaProcessorOptions: SchemaProcessorOptions = {
    isInputSchema: true,
    expandArrayOutputs: true,
    expandArrayOutputsDepth: Constants.MAX_EXPAND_ARRAY_DEPTH,
    excludeAdvanced: false,
    excludeInternal: false,
  };

  let inputs: SchemaProperty[];
  const schemaWithEscapedProperties = { ...schema };

  if (schema.type === Constants.SWAGGER.TYPE.ARRAY) {
    if (schema.itemSchema && schema.itemSchema.properties) {
      schemaWithEscapedProperties.itemSchema = {
        ...schemaWithEscapedProperties.itemSchema,
        properties: escapeSchemaProperties(schema.itemSchema.properties),
      };
    }
  } else if (schema.type === Constants.SWAGGER.TYPE.OBJECT && schema.properties) {
    schemaWithEscapedProperties.properties = { ...escapeSchemaProperties(schema.properties) };
  }

  try {
    inputs = new SchemaProcessor(schemaProcessorOptions).getSchemaProperties(schemaWithEscapedProperties);
  } catch {
    return false;
  }

  if (isArray) {
    // NOTE: for simple primitive array, check whether the value type is same as the designated type or string type (expression)
    if ((value as any[]).every((item) => typeof item !== 'object')) {
      return inputs.length === 1 && (value as any[]).every((item) => typeof item === inputs[0].type || isTemplateExpression(item));
    }
  }

  const copyValue = isArray ? [...value] : value;
  let isCompatible = true;
  let itemValue = isArray ? copyValue.shift() : copyValue;
  const inputKeys = inputs.map((input) => input.name);
  let itemInput: SchemaProperty | undefined;
  const rootItemKey = createEx([
    { type: SegmentType.Property, value: DefaultKeyPrefix },
    { type: SegmentType.Index, value: undefined },
  ]);
  if (schema.type === Constants.SWAGGER.TYPE.ARRAY) {
    itemInput = first((item) => item.key === rootItemKey, inputs);
  }

  while (itemValue && isCompatible) {
    // if itemValue is referring to primitive array
    if (
      itemInput &&
      itemInput.type !== Constants.SWAGGER.TYPE.ARRAY &&
      itemInput.type !== Constants.SWAGGER.TYPE.OBJECT &&
      !shallowArrayCheck
    ) {
      isCompatible =
        Array.isArray(itemValue) && (itemValue as any[]).every((item) => typeof item === itemInput?.type || typeof item === 'string');
    } else {
      const valueKeys = Object.keys(itemValue).map((key) => encodePropertySegment(key));
      if (valueKeys.length > inputKeys.length) {
        isCompatible = false;
        break;
      }

      for (const valueKey of valueKeys) {
        const propertyValue = itemValue[valueKey];
        const propertySchema =
          schema.type === Constants.SWAGGER.TYPE.ARRAY ? schema.items : schema['properties'] && schema['properties'][valueKey];
        // NOTE: if the property value is array or object, check the value/schema compatibility recursively
        if (Array.isArray(propertyValue) && !shallowArrayCheck) {
          if (
            !isArrayOrObjectValueCompatibleWithSchema(
              propertyValue,
              propertySchema && propertySchema.items,
              /* isArray */ true,
              shallowArrayCheck
            )
          ) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (isObject(propertyValue)) {
          if (!isArrayOrObjectValueCompatibleWithSchema(propertyValue, propertySchema, /* isArray */ false, shallowArrayCheck)) {
            isCompatible = false;
            break;
          }
          continue;
        } else if (inputKeys.indexOf(valueKey) < 0) {
          isCompatible = false;
          break;
        }
      }
    }

    itemValue = isArray ? copyValue.shift() : undefined;
  }

  return isCompatible;
}

export function escapeSchemaProperties(schemaProperties: Record<string, any>): Record<string, any> {
  const escapedSchemaProperties: Record<string, any> = {};

  for (const propertyName of Object.keys(schemaProperties)) {
    const escapedPropertyName = tryConvertStringToExpression(propertyName);
    escapedSchemaProperties[escapedPropertyName] = schemaProperties[propertyName];
  }

  return escapedSchemaProperties;
}
