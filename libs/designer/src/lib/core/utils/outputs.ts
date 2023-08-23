import Constants from '../../common/constants';
import type { ConnectionReference } from '../../common/models/workflow';
import { updateOutputsAndTokens } from '../actions/bjsworkflow/initialize';
import type { Settings } from '../actions/bjsworkflow/settings';
import { getConnectorWithSwagger } from '../queries/connections';
import { getOperationManifest } from '../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOutputs, OutputInfo } from '../state/operation/operationMetadataSlice';
import { ErrorLevel, updateErrorDetails, clearDynamicOutputs, addDynamicOutputs } from '../state/operation/operationMetadataSlice';
import { addDynamicTokens } from '../state/tokens/tokensSlice';
import type { WorkflowParameterDefinition } from '../state/workflowparameters/workflowparametersSlice';
import { getBrandColorFromConnector, getIconUriFromConnector } from './card';
import { getTokenExpressionValueForManifestBasedOperation } from './loops';
import { getDynamicOutputsFromSchema, getDynamicSchema } from './parameters/dynamicdata';
import {
  generateExpressionFromKey,
  getAllInputParameters,
  getTokenExpressionMethodFromKey,
  isDynamicDataReadyToLoad,
} from './parameters/helper';
import { convertOutputsToTokens } from './tokens';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import { generateSchemaFromJsonString, ValueSegmentType } from '@microsoft/designer-ui';
import { getIntl } from '@microsoft/intl-logic-apps';
import type {
  Expression,
  ExpressionFunction,
  ExpressionLiteral,
  OutputParameter,
  OutputParameters,
  Schema,
} from '@microsoft/parsers-logic-apps';
import {
  create,
  OutputKeys,
  OutputSource,
  ExpressionParser,
  ExtensionProperties,
  isTemplateExpression,
  isFunction,
  isStringLiteral,
} from '@microsoft/parsers-logic-apps';
import type { OpenAPIV2, OperationManifest } from '@microsoft/utils-logic-apps';
import {
  ConnectionReferenceKeyFormat,
  getObjectPropertyValue,
  safeSetObjectPropertyValue,
  unmap,
  AssertionErrorCode,
  AssertionException,
  clone,
  equals,
} from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

export const toOutputInfo = (output: OutputParameter): OutputInfo => {
  const {
    key,
    format,
    type,
    isDynamic,
    isInsideArray,
    name,
    itemSchema,
    parentArray,
    title,
    schema,
    summary,
    description,
    source,
    required,
    visibility,
    alias,
  } = output;

  return {
    key,
    type,
    format,
    isAdvanced: equals(visibility, Constants.VISIBILITY.ADVANCED),
    name,
    isDynamic,
    isInsideArray,
    itemSchema,
    parentArray,
    title: title ?? summary ?? description ?? name,
    schema,
    source,
    required,
    description,
    alias,
  };
};

export const removeAliasingKeyRedundancies = (openAPIkey: string): string => {
  // Aliased outputs (e.g., OpenAPI) may appear in the following format:
  //   'outputs.$.body.foo.foo/bar.foo/bar/baz'
  // This function converts an OpenAPI operation key to a non-redundant format as such:
  //   'outputs.$.body.foo/bar/baz'
  const pathSegments = openAPIkey.split('.');
  for (let i = 0; i < pathSegments.length - 1; i++) {
    const currentPathSegmentStringValue = pathSegments[i];
    const nextPathSegmentStringValue = pathSegments[i + 1];

    if (nextPathSegmentStringValue.startsWith(`${currentPathSegmentStringValue}/`)) {
      pathSegments.splice(i, 1);
      i--;
    }
  }
  return pathSegments.join('.');
};

export const getUpdatedManifestForSplitOn = (manifest: OperationManifest, splitOn: string | undefined): OperationManifest => {
  const intl = getIntl();
  const invalidSplitOn = intl.formatMessage(
    {
      defaultMessage: `Invalid split on format in '{splitOn}'.`,
      description: 'Error message for invalid split on value.',
    },
    { splitOn }
  );

  if (splitOn === undefined) {
    return manifest;
  } else if (typeof splitOn === 'string') {
    const updatedManifest = clone(manifest);
    if (!isTemplateExpression(splitOn)) {
      throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, invalidSplitOn);
    }

    const isAliasPathParsingEnabled =
      manifest.properties.connectionReference?.referenceKeyFormat === ConnectionReferenceKeyFormat.OpenApi ||
      manifest.properties.connectionReference?.referenceKeyFormat === ConnectionReferenceKeyFormat.HybridTrigger;
    const parsedValue = ExpressionParser.parseTemplateExpression(splitOn, isAliasPathParsingEnabled);
    const properties: string[] = [];
    let manifestSection = updatedManifest.properties.outputs;
    if (isSupportedSplitOnExpression(parsedValue)) {
      const { dereferences, name } = parsedValue as ExpressionFunction;

      if (equals(name, 'triggerBody')) {
        properties.push('body');
      }

      if (dereferences.length) {
        properties.push(...dereferences.map((dereference) => (dereference.expression as ExpressionLiteral).value));
      }
    } else {
      throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, invalidSplitOn);
    }

    for (const property of properties) {
      manifestSection = manifestSection.properties ? manifestSection.properties[property] : undefined;

      if (!manifestSection) {
        throw new AssertionException(
          AssertionErrorCode.INVALID_SPLITON,
          intl.formatMessage(
            {
              defaultMessage: `Invalid split on value ''{splitOn}'', cannot find in outputs.`,
              description:
                'Error message for when split on value not found in operation outputs. Do not remove the double single quotes around the placeholder text, as it is needed to wrap the placeholder text in single quotes.',
            },
            { splitOn }
          )
        );
      }
    }

    if (manifestSection.type === undefined) {
      updatedManifest.properties.outputs = {
        properties: { ...updatedManifest.properties.outputs.properties, body: {} },
        type: Constants.SWAGGER.TYPE.OBJECT,
      };
      return updatedManifest;
    }

    if (manifestSection.type !== Constants.SWAGGER.TYPE.ARRAY) {
      throw new AssertionException(
        AssertionErrorCode.INVALID_SPLITON,
        intl.formatMessage(
          {
            defaultMessage: `Invalid type on split on value ''{splitOn}'', split on not in array.`,
            description:
              'Error message for when split on array is invalid. Do not remove the double single quotes around the placeholder text, as it is needed to wrap the placeholder text in single quotes.',
          },
          { splitOn }
        )
      );
    }

    const manifestItems: OpenAPIV2.SchemaObject | undefined = clone(manifestSection.items);
    const updatedManifestItems = isAliasPathParsingEnabled ? getUpdatedAliasInItemProperties(manifestItems) : manifestItems;

    updatedManifest.properties.outputs = {
      properties: {
        ...updatedManifest.properties.outputs.properties,
        body: updatedManifestItems,
      },
      type: Constants.SWAGGER.TYPE.OBJECT,
    };

    return updatedManifest;
  }

  throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, invalidSplitOn);
};

const getUpdatedAliasInItemProperties = (schemaItem: OpenAPIV2.SchemaObject | undefined): OpenAPIV2.SchemaObject | undefined => {
  const properties = schemaItem?.properties;

  if (properties) {
    for (const itemName of Object.keys(properties)) {
      const splitOnItem = properties[itemName];
      convertSchemaAliasesForSplitOn(splitOnItem);
    }
  }

  return schemaItem;
};

const convertSchemaAliasesForSplitOn = (schema: OpenAPIV2.SchemaObject): void => {
  // Copy to local scope since we intentionally want to modify it in-place.
  const schemaLocal = schema;

  const aliasExtension = ExtensionProperties.Alias;
  const originalSchemaAlias = schemaLocal[aliasExtension];

  if (originalSchemaAlias) {
    schemaLocal[aliasExtension] = `body/${originalSchemaAlias}`;
  }

  const schemaProperties = schemaLocal.properties;
  if (schemaProperties) {
    for (const property of Object.values(schemaProperties)) {
      convertSchemaAliasesForSplitOn(property);
    }
  }
};

export const isSupportedSplitOnExpression = (expression: Expression): boolean => {
  if (!isFunction(expression)) {
    return false;
  }

  if (!equals(expression.name, 'triggerBody') && !equals(expression.name, 'triggerOutputs')) {
    return false;
  }

  if (expression.arguments.length > 0) {
    return false;
  }

  if (expression.dereferences.some((dereference) => !isStringLiteral(dereference.expression))) {
    return false;
  }

  return true;
};

export const getSplitOnOptions = (outputs: NodeOutputs, isManifestBasedOperation: boolean): string[] => {
  let arrayOutputs = unmap(outputs.originalOutputs ?? outputs.outputs).filter((output) =>
    equals(output.type, Constants.SWAGGER.TYPE.ARRAY)
  );

  // make sure keys are not redundant due to aliasing key format
  arrayOutputs = arrayOutputs.map((output) => {
    if (!output.alias) return output;
    return { ...output, key: removeAliasingKeyRedundancies(output.key) };
  });

  // NOTE: The isInsideArray flag is unreliable, as this is reset when calculating
  // if an output is inside a splitOn array. If the entire body is an array, all other array
  // outputs are nested and should not be included. An array with a parent array is nested and
  // should not be included.
  const bodyLevelArrayMatches = arrayOutputs.filter((output) => output.key === 'body.$');
  if (bodyLevelArrayMatches.length === 1) {
    return bodyLevelArrayMatches.map((output) => getExpressionValueForTriggerOutput(output, isManifestBasedOperation));
  }

  return arrayOutputs
    .filter((output) => !output.isInsideArray && !output.parentArray)
    .map((output) => getExpressionValueForTriggerOutput(output, isManifestBasedOperation));
};

export const getUpdatedManifestForSchemaDependency = (manifest: OperationManifest, inputs: NodeInputs): OperationManifest => {
  const outputPaths = manifest.properties.outputsSchema?.outputPaths ?? [];
  if (!outputPaths.length) {
    return manifest;
  }

  const updatedManifest = clone(manifest);
  const allInputs = getAllInputParameters(inputs);

  for (const outputPath of outputPaths) {
    const { outputLocation, name, schema } = outputPath;
    const inputParameter = allInputs.find((input) => input.parameterName === name);
    // Parameter value should be of single segment, else its value or schema cannot be identified
    // skipping for all other cases.
    if (inputParameter && inputParameter.value.length === 1) {
      const segment = inputParameter.value[0];
      let schemaToReplace: OpenAPIV2.SchemaObject | undefined;
      switch (schema) {
        case 'Value':
          if (segment.type === ValueSegmentType.LITERAL) {
            try {
              schemaToReplace = JSON.parse(segment.value);
            } catch {} // eslint-disable-line no-empty
          }
          break;

        case 'ValueSchema':
          if (segment.type === ValueSegmentType.TOKEN) {
            // We only support getting schema from array tokens for now.
            if (segment.token?.type === Constants.SWAGGER.TYPE.ARRAY) {
              schemaToReplace = segment.token.schema ?? undefined;
            }
          } else {
            // TODO - Add code to generate schema from value input
            try {
              schemaToReplace = generateSchemaFromJsonString(segment.value);
            } catch {} // eslint-disable-line no-empty
          }
          break;

        case 'UriTemplate':
          if (segment.type === ValueSegmentType.LITERAL) {
            const parameterSegments = segment.value ? segment.value.match(/{(.*?)}/g) : undefined;
            if (parameterSegments) {
              const parameters = parameterSegments.map((parameter) => parameter.slice(1, -1));
              schemaToReplace = {
                properties: parameters.reduce((properties: Record<string, any>, parameter: string) => {
                  return {
                    ...properties,
                    [parameter]: {
                      type: Constants.SWAGGER.TYPE.STRING,
                      title: parameter,
                    },
                  };
                }, {}),
                required: parameters,
              };
            }
          }

          break;

        default:
          break;
      }

      const currentSchemaValue = getObjectPropertyValue(updatedManifest.properties.outputs, outputLocation);

      const isRequestApiConnectionTrigger =
        !!updatedManifest.properties?.inputs?.properties?.schema?.['x-ms-editor-options']?.isRequestApiConnectionTrigger;

      let schemaValue: Schema;
      let shouldMerge: boolean;
      // if schema contains static object returned from RP, merge the current schema value and new schema value
      if (isRequestApiConnectionTrigger && schemaToReplace && 'rows' in schemaToReplace) {
        if ('rows' in currentSchemaValue) {
          schemaValue = { ...currentSchemaValue, ...schemaToReplace };
          shouldMerge = true;
        } else {
          schemaValue = currentSchemaValue;
          shouldMerge = false;
        }
      } else {
        continue;
      }
      safeSetObjectPropertyValue(updatedManifest.properties.outputs, outputLocation, schemaValue, shouldMerge);
    }
  }

  return updatedManifest;
};

const getSplitOnArrayName = (splitOnValue: string): string | undefined => {
  if (isTemplateExpression(splitOnValue)) {
    try {
      // TODO: Might require aliasing path parsing support
      const parsedValue = ExpressionParser.parseTemplateExpression(splitOnValue);
      if (isSupportedSplitOnExpression(parsedValue)) {
        const { dereferences } = parsedValue as ExpressionFunction;
        return !dereferences.length
          ? undefined
          : dereferences.map((dereference) => (dereference.expression as ExpressionLiteral).value).join('.');
      } else {
        return undefined;
      }
    } catch {
      // If parsing fails, the splitOn expression is not supported.
      return undefined;
    }
  } else {
    // If the value is not an expression, there is no array name.
    return undefined;
  }
};

export const updateOutputsForBatchingTrigger = (outputs: OutputParameters, splitOn: string | undefined): OutputParameters => {
  if (splitOn === undefined) {
    return outputs;
  }

  const splitOnArray = getSplitOnArrayName(splitOn);
  // If splitOn is enabled the output info is not present in the store, hence generate the outputKey from the name.
  const outputKeyForSplitOnArray = splitOnArray ? create([OutputSource.Body, Constants.DEFAULT_KEY_PREFIX, splitOnArray]) : undefined;

  const updatedOutputs: OutputParameters = {};
  for (const outputKey of Object.keys(outputs)) {
    const outputParameter = outputs[outputKey];

    const isParentArrayResponseBody = splitOnArray === undefined && outputParameter.parentArray === OutputKeys.Body;

    const isOutputInSplitOnArray =
      (outputParameter.isInsideArray && isParentArrayResponseBody) || equals(outputParameter.parentArray, splitOnArray);
    // Resetting the InsideArray property for parameters in batching trigger,
    // as for the actions in flow they are body parameters not inside an array.
    if (isOutputInSplitOnArray) {
      outputParameter.isInsideArray = false;
    }

    // Filtering the outputs if it is not equal to the top level array in a batching trigger.
    if (outputParameter.key !== outputKeyForSplitOnArray) {
      updatedOutputs[outputKey] = outputParameter;
    }
  }

  return updatedOutputs;
};

export const loadDynamicOutputsInNode = async (
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference | undefined,
  outputDependencies: Record<string, DependencyInfo>,
  nodeInputs: NodeInputs,
  settings: Settings,
  workflowParameters: Record<string, WorkflowParameterDefinition>,
  dispatch: Dispatch
): Promise<void> => {
  for (const outputKey of Object.keys(outputDependencies)) {
    const info = outputDependencies[outputKey];
    dispatch(clearDynamicOutputs(nodeId));

    if (isDynamicDataReadyToLoad(info)) {
      if (info.dependencyType === 'StaticSchema') {
        updateOutputsAndTokens(nodeId, operationInfo, dispatch, isTrigger, nodeInputs, settings, /* shouldProcessSettings */ true);
      } else {
        try {
          const outputSchema = await getDynamicSchema(
            info,
            nodeInputs,
            operationInfo,
            connectionReference,
            /* variables */ undefined,
            /* idReplacements */ undefined,
            workflowParameters
          );
          let schemaOutputs = outputSchema ? getDynamicOutputsFromSchema(outputSchema, info.parameter as OutputParameter) : {};

          if (settings.splitOn?.value?.enabled) {
            schemaOutputs = updateOutputsForBatchingTrigger(schemaOutputs, settings.splitOn?.value?.value);
          }

          const dynamicOutputs = Object.keys(schemaOutputs).reduce((result: Record<string, OutputInfo>, outputKey: string) => {
            const outputInfo = toOutputInfo(schemaOutputs[outputKey]);
            return { ...result, [outputInfo.key]: outputInfo };
          }, {});

          dispatch(addDynamicOutputs({ nodeId, outputs: dynamicOutputs }));

          let iconUri: string, brandColor: string;
          if (OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)) {
            const manifest = await getOperationManifest(operationInfo);
            iconUri = manifest.properties.iconUri;
            brandColor = manifest.properties.brandColor;
          } else {
            const { connector } = await getConnectorWithSwagger(operationInfo.connectorId);
            iconUri = getIconUriFromConnector(connector);
            brandColor = getBrandColorFromConnector(connector);
          }

          dispatch(
            addDynamicTokens({
              nodeId,
              tokens: convertOutputsToTokens(
                isTrigger ? undefined : nodeId,
                operationInfo.type,
                dynamicOutputs,
                { iconUri, brandColor },
                settings
              ),
            })
          );
        } catch (error: any) {
          const message = error.message as string;
          const errorMessage = getIntl().formatMessage(
            {
              defaultMessage: `Failed to retrieve dynamic outputs. As a result, this operation's outputs might not be visible in subsequent actions. Error details: {message}`,
              description: 'Error message to show when loading dynamic outputs failed.',
            },
            {
              message,
            }
          );

          dispatch(
            updateErrorDetails({
              id: nodeId,
              errorInfo: { level: ErrorLevel.DynamicOutputs, message: errorMessage, error, code: error.code },
            })
          );
        }
      }
    }
  }
};

const getExpressionValueForTriggerOutput = ({ key, required }: OutputInfo, isManifestBasedOperation: boolean): string => {
  if (isManifestBasedOperation) {
    return `@${getTokenExpressionValueForManifestBasedOperation(
      key,
      /* isInsideArray */ false,
      /* loopSource */ undefined,
      /* actionName */ undefined,
      !!required
    )}`;
  } else {
    const method = getTokenExpressionMethodFromKey(key, /* actionName */ undefined);
    return `@${generateExpressionFromKey(method, key, /* actionName */ undefined, /* isInsideArray */ false, !!required)}`;
  }
};
