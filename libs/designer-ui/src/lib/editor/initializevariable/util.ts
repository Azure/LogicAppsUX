import type { OperationInfo } from '@microsoft/logic-apps-shared';
import {
  capitalizeFirstLetter,
  equals,
  getIntl,
  isTemplateExpression,
  LogEntryLevel,
  LoggerService,
  wrapStringifiedTokenSegments,
} from '@microsoft/logic-apps-shared';
import type { InitializeVariableProps } from '.';
import { createEmptyLiteralValueSegment, createLiteralValueSegment } from '../base/utils/helper';
import { convertSegmentsToString, isEmptySegments } from '../base/utils/parsesegments';
import type { ValueSegment } from '../models/parameter';
import { convertStringToSegments } from '../base/utils/editorToSegment';
import constants, { VARIABLE_TYPE } from '../../constants';
import { VARIABLE_PROPERTIES, type InitializeVariableErrors } from './variableEditor';

export const parseVariableEditorSegments = (initialValue: ValueSegment[]): InitializeVariableProps[] | undefined => {
  if (isEmptySegments(initialValue)) {
    return [
      { name: [createEmptyLiteralValueSegment()], type: [createEmptyLiteralValueSegment()], value: [createEmptyLiteralValueSegment()] },
    ];
  }

  const nodeMap: Map<string, ValueSegment> = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);
  const wrappedValueString = wrapStringifiedTokenSegments(initialValueString);

  try {
    const variables = JSON.parse(wrappedValueString);

    return Array.isArray(variables)
      ? variables.map((variable: { name: string; type: string; value: string }) => ({
          name: [createLiteralValueSegment(variable.name)],
          type: [createLiteralValueSegment(variable.type)],
          value: convertStringToSegments(variable.value, nodeMap, {
            tokensEnabled: true,
            stringifyNonString: variable.type !== VARIABLE_TYPE.STRING,
          }),
        }))
      : [];
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'Variable Editor',
      message: 'Failed to parse variable editor segments',
      args: [
        {
          error,
        },
      ],
    });
    return undefined;
  }
};

export const parseSchemaAsVariableEditorSegments = (initialValue: ValueSegment[]): InitializeVariableProps[] | undefined => {
  if (isEmptySegments(initialValue)) {
    return [];
  }
  const nodeMap: Map<string, ValueSegment> = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);
  const wrappedValueString = wrapStringifiedTokenSegments(initialValueString);

  try {
    const schema = JSON.parse(wrappedValueString);

    if (schema.type !== 'object' || !schema.properties || typeof schema.properties !== 'object') {
      return [];
    }

    return Object.entries(schema.properties).map(([key, property]: [string, any]) => {
      const { name, type, description } = property;
      return {
        name: [createLiteralValueSegment(name || key)],
        type: [createLiteralValueSegment(type)],
        description: convertStringToSegments(description, nodeMap, {
          tokensEnabled: true,
          stringifyNonString: true,
        }),
        value: [createEmptyLiteralValueSegment()],
      };
    });
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'Schema Editor',
      message: 'Failed to parse schema editor segments',
      args: [{ error }],
    });
    return undefined;
  }
};

export const createVariableEditorSegments = (variables: InitializeVariableProps[] | undefined): ValueSegment[] => {
  if (!variables || variables.length === 0) {
    return [createEmptyLiteralValueSegment()];
  }

  const nodeMap = new Map<string, ValueSegment>();
  const mappedVariables = variables.map((variable) => {
    const name = convertSegmentsToString(variable.name);
    const type = convertSegmentsToString(variable.type);
    let value = convertSegmentsToString(variable.value, nodeMap);

    try {
      if (type !== VARIABLE_TYPE.STRING) {
        value = JSON.parse(value);
      }
    } catch (_error) {
      // do nothing
    }
    return value !== '' ? { name, type, value } : { name, type };
  });

  const stringifiedVariables = JSON.stringify(mappedVariables);

  return convertStringToSegments(stringifiedVariables, nodeMap, { tokensEnabled: true });
};

export const convertVariableEditorSegmentsAsSchema = (variables: InitializeVariableProps[] | undefined): ValueSegment[] => {
  if (!variables || variables.length === 0) {
    return [createEmptyLiteralValueSegment()];
  }

  const nodeMap = new Map<string, ValueSegment>();
  const properties: Record<string, any> = {};

  for (const variable of variables) {
    const { name: _name, type: _type, description: _description } = variable;
    const name = convertSegmentsToString(_name);
    const type = convertSegmentsToString(_type);
    const description = convertSegmentsToString(_description ?? [], nodeMap);

    if (!name && !type) {
      return [createEmptyLiteralValueSegment()];
    }

    properties[name] = {
      type,
      ...(description ? { description } : {}),
    };
  }

  const schema = {
    type: 'object',
    properties,
  };

  return convertStringToSegments(JSON.stringify(schema), nodeMap, { tokensEnabled: true });
};

export const getVariableType = (type: ValueSegment[]): string => {
  return type[0]?.value === VARIABLE_TYPE.FLOAT ? constants.SWAGGER.TYPE.NUMBER : type[0]?.value || constants.SWAGGER.TYPE.ANY;
};

export const validateVariables = (variables: InitializeVariableProps[]): InitializeVariableErrors[] => {
  const intl = getIntl();
  const errors: InitializeVariableErrors[] = [];

  variables.forEach((variable, index) => {
    const name = convertSegmentsToString(variable.name);
    const type = convertSegmentsToString(variable.type);
    const value = convertSegmentsToString(variable.value);

    // Ensure the error object for this index exists
    errors[index] = errors[index] || {};

    const getMissingPropertyMessage = (propertyName: string) => {
      return intl.formatMessage(
        {
          defaultMessage: `''{propertyName}'' is required`,
          id: 'GbgqGL',
          description:
            'Error message for missing property. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
        },
        { propertyName: capitalizeFirstLetter(propertyName) }
      );
    };

    if (!name) {
      errors[index][VARIABLE_PROPERTIES.NAME] = getMissingPropertyMessage(VARIABLE_PROPERTIES.NAME);
    }
    if (!type) {
      errors[index][VARIABLE_PROPERTIES.TYPE] = getMissingPropertyMessage(VARIABLE_PROPERTIES.TYPE);
    }
    const isExpression = isTemplateExpression(value);
    if (!isExpression && value !== '') {
      switch (type) {
        case VARIABLE_TYPE.BOOLEAN:
          if (!(equals(value, 'true') || equals(value, 'false'))) {
            errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
              defaultMessage: `''Value'' must be a valid boolean`,
              id: 'Aw8LkK',
              description:
                'Error validation message for invalid booleans. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
            });
          }
          break;
        case VARIABLE_TYPE.INTEGER:
          if (!/^-?\d+$/.test(value)) {
            errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
              defaultMessage: `''Value'' must be a valid integer`,
              id: 'BWIM2x',
              description:
                'Error validation message for invalid integer. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
            });
          }
          break;
        case VARIABLE_TYPE.FLOAT:
          if (!/^-?\d+(\.\d+)?$/.test(value)) {
            errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
              defaultMessage: `''Value'' must be a valid float`,
              id: '9kMtmY',
              description:
                'Error validation message for invalid float. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
            });
          }
          break;
        case VARIABLE_TYPE.OBJECT:
          try {
            JSON.parse(value);
          } catch (e) {
            // logger warning only to check if overvalidating
            LoggerService().log({
              level: LogEntryLevel.Warning,
              area: 'Variable Editor',
              message: 'Failed to parse variable value as JSON object',
              args: [
                {
                  error: e,
                },
              ],
            });
            errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
              defaultMessage: `''Value'' must be a valid JSON object`,
              id: 's2ydQX',
              description:
                'Error validation message for invalid JSON object. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
            });
          }
          break;
        case VARIABLE_TYPE.ARRAY:
          try {
            if (!Array.isArray(JSON.parse(value))) {
              throw new Error();
            }
          } catch (e) {
            // logger warning only to check if overvalidating
            LoggerService().log({
              level: LogEntryLevel.Warning,
              area: 'Variable Editor',
              message: 'Failed to parse variable value as JSON array',
              args: [
                {
                  error: e,
                },
              ],
            });
            errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
              defaultMessage: `''Value'' must be a valid JSON array`,
              id: 'cMvmv5',
              description:
                'Error validation message for invalid JSON array. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
            });
          }
          break;
        default:
          break;
      }
    }
  });

  return errors;
};

export const isInitializeVariableOperation = (operationInfo: OperationInfo): boolean => {
  const { connectorId, operationId } = operationInfo;
  return equals(connectorId, 'connectionProviders/variable') && equals(operationId, 'initializeVariable');
};
