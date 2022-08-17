import Constants from '../../common/constants';
import type { NodeInputs, NodeOutputs, OutputInfo } from '../state/operation/operationMetadataSlice';
import { getAllInputParameters, getTokenExpressionValue } from './parameters/helper';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Expression, ExpressionFunction, ExpressionLiteral } from '@microsoft-logic-apps/parsers';
import { ExpressionParser, isTemplateExpression, isFunction, isStringLiteral } from '@microsoft-logic-apps/parsers';
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

const getExpressionValue = ({ name, required, key, title, source }: OutputInfo): string => {
  return `@${getTokenExpressionValue({ name, required, key, title, source, tokenType: TokenType.OUTPUTS })}`;
};
