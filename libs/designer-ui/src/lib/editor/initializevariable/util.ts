import type { OperationInfo } from '@microsoft/logic-apps-shared';
import {
  capitalizeFirstLetter,
  equals,
  getIntl,
  isTemplateExpression,
  LogEntryLevel,
  LoggerService,
  TokenType,
  wrapTokenValue,
} from '@microsoft/logic-apps-shared';
import type { InitializeVariableProps } from '.';
import { createEmptyLiteralValueSegment, createLiteralValueSegment, isTokenValueSegment } from '../base/utils/helper';
import { convertSegmentsToString, isEmptySegments } from '../base/utils/parsesegments';
import { ValueSegmentType, type ValueSegment } from '../models/parameter';
import { convertStringToSegments } from '../base/utils/editorToSegment';
import constants, { VARIABLE_TYPE } from '../../constants';
import { VARIABLE_PROPERTIES, type InitializeVariableErrors } from './variableEditor';
import type { loadParameterValueFromStringHandler } from '../base';
import type { IntlShape } from 'react-intl';

export const getParameterValue = (
  rawValue: string,
  type: string,
  nodeMap: Map<string, ValueSegment>,
  loadParameterValueFromString?: (value: string) => ValueSegment[] | undefined
): ValueSegment[] => {
  const valueSegments = loadParameterValueFromString?.(rawValue);

  if (!valueSegments) {
    return convertStringToSegments(rawValue, nodeMap, {
      tokensEnabled: true,
      stringifyNonString: type !== VARIABLE_TYPE.STRING,
    });
  }

  return valueSegments.map((segment) => {
    if (segment.type === ValueSegmentType.TOKEN && segment.token) {
      const token = segment.token;

      // If not an FX token, attempt to resolve from nodeMap
      if (token.tokenType !== TokenType.FX && segment.value) {
        const resolvedSegment = nodeMap.get(wrapTokenValue(segment.value));
        return resolvedSegment ?? segment;
      }
    }

    return segment;
  });
};

export const wrapStringifiedTokenSegments = (jsonString: string): string => {
  // Making this so that it doesn't match with {} within the token
  const tokenRegex = /:\s?("@\{(?:[^{}]|\{[^}]*\})*\}")|:\s?(@\{(?:[^{}]|\{[^}]*\})*\})/gs;

  // Normalize newlines and carriage returns inside tokens
  const normalized = jsonString.replace(/@\{(?:[^{}]|\{[^}]*\})*\}/gs, (match) => match.replace(/\n/g, '\\n').replace(/\r/g, '\\r'));

  return normalized.replace(tokenRegex, (match, quotedToken, unquotedToken) => {
    const token = quotedToken ?? unquotedToken;
    if (!token) {
      return match;
    }

    const isQuoted = quotedToken !== undefined;
    const innerToken = isQuoted ? token.slice(1, -1) : token;

    const escaped = innerToken
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v');

    return `: "${escaped}"`;
  });
};

// Determines if the value is a string-wrapped token
export const shouldUnescapeToken = (value: unknown): value is string => typeof value === 'string' && /^@\{[\s\S]*\}$/.test(value);

//We need to unescape tokens that are wrapped in @{...} as we need the raw value to load valueSegments
export const unescapeToken = (token: string): string =>
  token.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\v/g, '\v');

export const parseVariableEditorSegments = (
  initialValue: ValueSegment[],
  loadParameterValueFromString?: loadParameterValueFromStringHandler
): InitializeVariableProps[] | undefined => {
  if (isEmptySegments(initialValue)) {
    return [
      {
        name: [createEmptyLiteralValueSegment()],
        type: [createEmptyLiteralValueSegment()],
        value: [createEmptyLiteralValueSegment()],
      },
    ];
  }

  const nodeMap = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);
  const wrappedValueString = wrapStringifiedTokenSegments(initialValueString);

  try {
    const parsedVariables = JSON.parse(wrappedValueString);

    if (!Array.isArray(parsedVariables)) {
      return [];
    }

    return parsedVariables.map(({ name, type, value }) => {
      const rawValue = shouldUnescapeToken(value) ? unescapeToken(value) : value;

      return {
        name: [createLiteralValueSegment(name)],
        type: [createLiteralValueSegment(type)],
        value: getParameterValue(rawValue, type, nodeMap, loadParameterValueFromString),
      };
    });
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'Variable Editor',
      message: 'Failed to parse variable editor segments',
      args: [{ error }],
    });
    return undefined;
  }
};

export const parseSchemaAsVariableEditorSegments = (
  initialValue: ValueSegment[],
  loadParameterValueFromString?: loadParameterValueFromStringHandler
): InitializeVariableProps[] | undefined => {
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
      const rawValue = shouldUnescapeToken(description) ? unescapeToken(description) : description;
      return {
        name: [createLiteralValueSegment(name || key)],
        type: [createLiteralValueSegment(type)],
        description: getParameterValue(rawValue, type, nodeMap, loadParameterValueFromString),
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

const wrapUnquotedTokens = (value: string, nodeMap?: Map<string, ValueSegment>): string => {
  // Find property values that contain only tokens (one or more @{...} tokens with no other text)
  // This regex matches: property_name: followed by only tokens and whitespace
  // Updated to handle optional whitespace around the colon
  const propertyWithOnlyTokensRegex = /"[^"]*"\s*:\s*(@\{[^}]*\}(?:\s*@\{[^}]*\})*)\s*(?=[,}])/g;

  return value.replace(propertyWithOnlyTokensRegex, (match, tokensPart) => {
    // Check if this is a single token
    const singleTokenMatch = tokensPart.match(/^@\{([^}]*)\}$/);

    if (singleTokenMatch) {
      // Single token case - check if we should use non-string interpolation
      const fullTokenKey = tokensPart.trim(); // Use the full matched token, trimmed
      const tokenKey = singleTokenMatch[1]; // Inner content for @ syntax
      const tokenSegment = nodeMap?.get(fullTokenKey);

      if (tokenSegment && tokenSegment.token?.type !== constants.SWAGGER.TYPE.STRING) {
        // Use @ syntax for non-string tokens
        return match.replace(tokensPart, `"@${tokenKey}"`);
      }
    }

    // Multiple tokens or string token - wrap in quotes
    return match.replace(tokensPart, `"${tokensPart}"`);
  });
};

export const createVariableEditorSegments = (variables: InitializeVariableProps[] | undefined): ValueSegment[] => {
  if (!variables || variables.length === 0) {
    return [createEmptyLiteralValueSegment()];
  }

  const nodeMap = new Map<string, ValueSegment>();

  const mappedVariableStrings = variables.map((variable) => {
    const name = convertSegmentsToString(variable.name);
    const type = convertSegmentsToString(variable.type);
    const isStringType = type === VARIABLE_TYPE.STRING;
    const isObjectType = type === VARIABLE_TYPE.OBJECT;

    const valueSegments = variable.value;
    const isTokenSegment = isTokenValueSegment(valueSegments);
    let value = convertSegmentsToString(valueSegments, nodeMap);

    // Apply token wrapping for object types before parsing
    if (isObjectType && !isTokenSegment) {
      value = wrapUnquotedTokens(value, nodeMap);
    }

    try {
      if (!isStringType && !isTokenSegment) {
        value = JSON.parse(value);
      }
    } catch {
      // ignore parse errors
    }

    const parts = [`"name": ${JSON.stringify(name)}`, `"type": ${JSON.stringify(type)}`];

    if (value !== '') {
      if (isTokenSegment) {
        if (isStringType) {
          // Clean up multiline token before quoting
          const cleaned = value.replace(/[\r\n]+/g, '');
          parts.push(`"value": ${JSON.stringify(cleaned)}`);
        } else {
          parts.push(`"value": ${value}`);
        }
      } else {
        const valueStr = JSON.stringify(value);
        parts.push(`"value": ${valueStr}`);
      }
    }

    return `{ ${parts.join(', ')} }`;
  });

  const finalString = `[${mappedVariableStrings.join(',')}]`;
  return convertStringToSegments(finalString, nodeMap, { tokensEnabled: true });
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
    required: Object.keys(properties),
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

    const getInvalidValueMessage = (expectedType: string) => {
      return intl.formatMessage(
        {
          defaultMessage: "''Value'' must be a valid {expectedType}",
          id: '6ZzRu4',
          description:
            'Error validation message for type. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
        },
        { expectedType }
      );
    };

    if (!name) {
      errors[index][VARIABLE_PROPERTIES.NAME] = getMissingPropertyMessage(VARIABLE_PROPERTIES.NAME);
    }
    if (!type) {
      errors[index][VARIABLE_PROPERTIES.TYPE] = getMissingPropertyMessage(VARIABLE_PROPERTIES.TYPE);
    }

    const isExpression = isTemplateExpression(value);
    const shouldValidateValue = (!isExpression || type === VARIABLE_TYPE.OBJECT || type === VARIABLE_TYPE.ARRAY) && value !== '';

    if (!shouldValidateValue) {
      return;
    }

    switch (type) {
      case VARIABLE_TYPE.BOOLEAN:
        if (!equals(value, 'true') && !equals(value, 'false')) {
          errors[index][VARIABLE_PROPERTIES.VALUE] = getInvalidValueMessage('boolean');
        }
        break;

      case VARIABLE_TYPE.INTEGER:
        if (!/^-?\d+$/.test(value)) {
          errors[index][VARIABLE_PROPERTIES.VALUE] = getInvalidValueMessage('integer');
        }
        break;

      case VARIABLE_TYPE.FLOAT:
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          errors[index][VARIABLE_PROPERTIES.VALUE] = getInvalidValueMessage('float');
        }
        break;

      case VARIABLE_TYPE.OBJECT:
        validateObjectType(value, index, errors, intl, variable.value);
        break;

      case VARIABLE_TYPE.ARRAY:
        validateArrayType(value, index, errors, intl, variable.value);
        break;

      default:
        break;
    }
  });

  return errors;
};

const validateObjectType = (
  value: string,
  index: number,
  errors: InitializeVariableErrors[],
  intl: IntlShape,
  segmentValue: ValueSegment[]
) => {
  if (isTokenValueSegment(segmentValue)) {
    const type = segmentValue[0]?.token?.type;

    if (!type || type === constants.SWAGGER.TYPE.OBJECT) {
      return; // Either no type to check, or valid object type
    }
  }

  const trimmedValue = value.trim();

  // Must be wrapped in braces
  if (!trimmedValue.startsWith('{') || !trimmedValue.endsWith('}')) {
    errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
      defaultMessage: `''Value'' must be a valid JSON object`,
      id: 's2ydQX',
      description:
        'Error validation message for invalid JSON object. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
    });
    return;
  }

  // Must be valid JSON
  try {
    const wrappedValue = wrapUnquotedTokens(trimmedValue);
    JSON.parse(wrappedValue);
  } catch (e) {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'Variable Editor',
      message: 'Failed to parse variable value as JSON object',
      args: [{ error: e }],
    });
    errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
      defaultMessage: `''Value'' must be a valid JSON object`,
      id: 's2ydQX',
      description:
        'Error validation message for invalid JSON object. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
    });
  }
};

const validateArrayType = (
  value: string,
  index: number,
  errors: InitializeVariableErrors[],
  intl: IntlShape,
  segmentValue: ValueSegment[]
) => {
  if (isTokenValueSegment(segmentValue)) {
    const type = segmentValue[0]?.token?.type;

    if (!type || type === constants.SWAGGER.TYPE.ARRAY) {
      return; // Either no type to check, or valid array type
    }
  }
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error('Not an array');
    }
  } catch (e) {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'Variable Editor',
      message: 'Failed to parse variable value as JSON array',
      args: [{ error: e }],
    });
    errors[index][VARIABLE_PROPERTIES.VALUE] = intl.formatMessage({
      defaultMessage: `''Value'' must be a valid JSON array`,
      id: 'cMvmv5',
      description:
        'Error validation message for invalid JSON array. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
    });
  }
};

export const isInitializeVariableOperation = (operationInfo: OperationInfo): boolean => {
  const { connectorId, operationId } = operationInfo;
  return equals(connectorId, 'connectionProviders/variable') && equals(operationId, 'initializeVariable');
};
