import Constants from '../../common/constants';
import { updateOutputsAndTokens } from '../actions/bjsworkflow/initialize';
import type { Settings } from '../actions/bjsworkflow/settings';
import { getOperationManifest } from '../queries/operation';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOutputs, OutputInfo } from '../state/operation/operationMetadataSlice';
import { clearDynamicOutputs, addDynamicOutputs } from '../state/operation/operationMetadataSlice';
import { addDynamicTokens } from '../state/tokensSlice';
import { getDynamicOutputsFromSchema, getDynamicSchema } from './parameters/dynamicdata';
import { getAllInputParameters, getTokenExpressionValue, isDynamicDataReadyToLoad } from './parameters/helper';
import { convertOutputsToTokens } from './tokens';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Expression, ExpressionFunction, ExpressionLiteral, OutputParameter } from '@microsoft-logic-apps/parsers';
import {
  create,
  OutputKeys,
  OutputSource,
  ExpressionParser,
  isTemplateExpression,
  isFunction,
  isStringLiteral,
} from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import {
  getObjectPropertyValue,
  safeSetObjectPropertyValue,
  unmap,
  AssertionErrorCode,
  AssertionException,
  clone,
  equals,
} from '@microsoft-logic-apps/utils';
import { generateSchemaFromJsonString, TokenType, ValueSegmentType } from '@microsoft/designer-ui';
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
    summary,
    description,
    source,
    required,
    visibility,
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
    source,
    required,
    description,
  };
};
export const getUpdatedManifestForSpiltOn = (manifest: OperationManifest, splitOn: string | undefined): OperationManifest => {
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

    const parsedValue = ExpressionParser.parseTemplateExpression(splitOn);
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
              defaultMessage: `Invalid split on value '{splitOn}', cannot find in outputs.`,
              description: 'Error message for when split on value not found in operation outputs.',
            },
            { splitOn }
          )
        );
      }
    }

    if (manifestSection.type !== Constants.SWAGGER.TYPE.ARRAY) {
      throw new AssertionException(
        AssertionErrorCode.INVALID_SPLITON,
        intl.formatMessage(
          {
            defaultMessage: `Invalid type on split on value '{splitOn}', split on not in array.`,
            description: 'Error message for when split on array is invalid.',
          },
          { splitOn }
        )
      );
    }

    updatedManifest.properties.outputs = {
      properties: {
        body: clone(manifestSection.items),
      },
      type: Constants.SWAGGER.TYPE.OBJECT,
    };

    return updatedManifest;
  }

  throw new AssertionException(AssertionErrorCode.INVALID_SPLITON, invalidSplitOn);
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

export const getSplitOnOptions = (outputs: NodeOutputs): string[] => {
  const arrayOutputs = unmap(outputs.outputs).filter((output) => equals(output.type, Constants.SWAGGER.TYPE.ARRAY));

  // NOTE: The isInsideArray flag is unreliable, as this is reset when calculating
  // if an output is inside a splitOn array. If the entire body is an array, all other array
  // outputs are nested and should not be included. An array with a parent array is nested and
  // should not be included.
  const bodyLevelArrayMatches = arrayOutputs.filter((output) => output.key === 'body.$');
  if (bodyLevelArrayMatches.length === 1) {
    return bodyLevelArrayMatches.map(getExpressionValue);
  }

  return arrayOutputs.filter((output) => !output.isInsideArray && !output.parentArray).map(getExpressionValue);
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
              schemaToReplace = segment.token.arrayDetails?.itemSchema ?? undefined;
            }
          } else {
            // TODO - Add code to generate schema from value input
            schemaToReplace = generateSchemaFromJsonString(segment.value);
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
      safeSetObjectPropertyValue(updatedManifest.properties.outputs, outputLocation, { ...currentSchemaValue, ...schemaToReplace });
    }
  }

  return updatedManifest;
};

const getSplitOnArrayName = (splitOnValue: string): string | undefined => {
  if (isTemplateExpression(splitOnValue)) {
    try {
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

export const loadDynamicOutputsInNode = async (
  nodeId: string,
  isTrigger: boolean,
  operationInfo: NodeOperation,
  connectionId: string,
  outputDependencies: Record<string, DependencyInfo>,
  nodeInputs: NodeInputs,
  settings: Settings,
  dispatch: Dispatch
): Promise<void> => {
  const manifest = await getOperationManifest(operationInfo);
  for (const outputKey of Object.keys(outputDependencies)) {
    const info = outputDependencies[outputKey];
    dispatch(clearDynamicOutputs(nodeId));

    if (isDynamicDataReadyToLoad(info)) {
      if (info.dependencyType === 'StaticSchema') {
        updateOutputsAndTokens(nodeId, operationInfo.type, dispatch, manifest, isTrigger, nodeInputs, settings);
      } else {
        const targetSchema = await getDynamicSchema(info, nodeInputs, connectionId, operationInfo);
        const schemaOutputs = getDynamicOutputsFromSchema(targetSchema, info.parameter as OutputParameter);
        const hasSplitOn = settings.splitOn?.value?.enabled;

        if (hasSplitOn) {
          const splitOnArray = getSplitOnArrayName(settings.splitOn?.value?.value as string);
          // If splitOn is enabled the output info is not present in the store, hence generate the outputKey from the name.
          const outputKeyForSplitOnArray = splitOnArray
            ? create([OutputSource.Body, Constants.DEFAULT_KEY_PREFIX, splitOnArray])
            : undefined;

          for (const outputKey of Object.keys(schemaOutputs)) {
            const outputParameter = schemaOutputs[outputKey];

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
              schemaOutputs[outputKey] = outputParameter;
            }
          }
        }

        const dynamicOutputs = Object.keys(schemaOutputs).reduce((result: Record<string, OutputInfo>, outputKey: string) => {
          const outputInfo = toOutputInfo(schemaOutputs[outputKey]);
          return { ...result, [outputInfo.key]: outputInfo };
        }, {});

        dispatch(addDynamicOutputs({ nodeId, outputs: dynamicOutputs }));
        dispatch(
          addDynamicTokens({
            nodeId,
            tokens: convertOutputsToTokens(
              nodeId,
              operationInfo.type,
              dynamicOutputs,
              { iconUri: manifest?.properties.iconUri, brandColor: manifest?.properties.brandColor },
              settings
            ),
          })
        );
      }
    }
  }
};

const getExpressionValue = ({ name, required, key, title, source }: OutputInfo): string => {
  return `@${getTokenExpressionValue({ name, required, key, title, source, tokenType: TokenType.OUTPUTS })}`;
};
