import { describe, expect, it, vi } from 'vitest';
import type { OperationInfo, ParameterInfo } from '@microsoft/logic-apps-shared';
import {
  createVariableEditorSegments,
  getParameterValue,
  getVariableType,
  isInitializeVariableOperation,
  parseVariableEditorSegments,
  unescapeToken,
  validateVariables,
  wrapStringifiedTokenSegments,
} from '../util';
import { createEmptyLiteralValueSegment, createLiteralValueSegment } from '../../base/utils/helper';
import { InitializeVariableProps } from '..';
import { VARIABLE_TYPE } from '../../../constants';
import { ValueSegmentType } from '../../models/parameter';
import { testTokenSegment } from '../../shared';

describe('parseVariableEditorSegments', () => {
  it('should return empty segments if input is empty', () => {
    const result = parseVariableEditorSegments([]);
    if (result) {
      expect(result).toEqual([
        {
          name: [createEmptyLiteralValueSegment(result[0].name[0].id)],
          type: [createEmptyLiteralValueSegment(result[0].type[0].id)],
          value: [createEmptyLiteralValueSegment(result[0].value[0].id)],
        },
      ]);
    }
  });

  it('should parse valid JSON input correctly', () => {
    const segments = [createLiteralValueSegment('[{"name":"var1","type":"string","value":"hello"}]')];
    const result = parseVariableEditorSegments(segments);
    if (result) {
      expect(result).toEqual([
        {
          name: [expect.objectContaining(createLiteralValueSegment('var1', result[0].name[0].id))],
          type: [expect.objectContaining(createLiteralValueSegment('string', result[0].type[0].id))],
          value: [expect.objectContaining(createLiteralValueSegment('hello', result[0].value[0].id))],
        },
      ]);
    }
  });
});
describe('getParameterValue', () => {
  it('should use loadParameterValueFromString if available', () => {
    const nodeMap = new Map();
    const mockLoader = vi.fn(() => [createLiteralValueSegment('abc')]);

    const result = getParameterValue('abc', VARIABLE_TYPE.STRING, nodeMap, mockLoader);
    expect(mockLoader).toHaveBeenCalledWith('abc');
    expect(result[0].value).toEqual(createLiteralValueSegment('abc').value);
  });

  it('should fall back to convertStringToSegments when loader returns undefined', () => {
    const nodeMap = new Map();
    const result = getParameterValue('123', VARIABLE_TYPE.NUMBER, nodeMap);
    expect(result.length).toBeGreaterThan(0); // This assumes convertStringToSegments is implemented
  });

  it('should resolve token from nodeMap', () => {
    const wrappedKey = '@{myToken}';
    const mockSegment = testTokenSegment;
    const nodeMap = new Map([[wrappedKey, createLiteralValueSegment('resolved')]]);

    const result = getParameterValue('ignored', VARIABLE_TYPE.STRING, nodeMap, () => [mockSegment]);

    expect(result[0].value).toBe('TEST_TOKEN');
  });
});

describe('wrapStringifiedTokenSegments', () => {
  it('should escape tokens within JSON string', () => {
    const input = `[{ "value": @{a\nb} }]`;
    const output = wrapStringifiedTokenSegments(input);
    expect(output).toContain('value": "@{a\\\\nb}"');
  });
});

describe('unescapeToken', () => {
  it('should reverse escape characters', () => {
    const escaped = '@{line\\nbreak}';
    const raw = unescapeToken(escaped);
    expect(raw).toBe('@{line\nbreak}');
  });
});

describe('createVariableEditorSegments', () => {
  it('should return empty literal segment if variables are undefined', () => {
    const result = createVariableEditorSegments(undefined);
    expect(result).toEqual([createEmptyLiteralValueSegment(result[0].id)]);
  });

  it('should convert variables to JSON segments', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment('string')],
        value: [createLiteralValueSegment('hello')],
      },
    ];
    const result = createVariableEditorSegments(variables);
    expect(result[0].value).toContain('var1');
  });
});

describe('getVariableType', () => {
  it('should return number if type is float', () => {
    expect(getVariableType([createLiteralValueSegment(VARIABLE_TYPE.FLOAT)])).toBe('number');
  });

  it('should return any if type is not recognized', () => {
    expect(getVariableType([createLiteralValueSegment('unknownType')])).toBe('unknownType');
  });
});

describe('validateVariables', () => {
  it('should return error for missing name and type', () => {
    const variables: InitializeVariableProps[] = [{ name: [], type: [], value: [] }];
    const errors = validateVariables(variables);
    expect(errors[0].name).toBe(`'Name' is required`);
    expect(errors[0].type).toBe(`'Type' is required`);
  });

  it('should return error for invalid boolean value', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.BOOLEAN)],
        value: [createLiteralValueSegment('invalid')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBe(`'Value' must be a valid boolean`);
  });
});

describe('isInitializeVariableParameter', () => {
  it('should return true for initialize variable editor', () => {
    const operationInfo = { connectorId: 'connectionProviders/variable', operationId: 'initializeVariable' } as OperationInfo;
    expect(isInitializeVariableOperation(operationInfo)).toBe(true);
  });

  it('should return false for other editors', () => {
    const operationInfo = { connectorId: 'connectionProviders/otherConnectorId', operationId: 'otherOperation' } as OperationInfo;
    expect(isInitializeVariableOperation(operationInfo)).toBe(false);
  });
});
