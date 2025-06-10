import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InitLoggerService, LoggerService, type OperationInfo, type ParameterInfo } from '@microsoft/logic-apps-shared';
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
import constants, { VARIABLE_TYPE } from '../../../constants';
import { ValueSegmentType } from '../../models/parameter';
import { testTokenSegment } from '../../shared';
import { createMockVariableValueSegment } from '../../shared/testtokensegment';

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
  const loggerService: any = {
    log() {},
  };
  beforeAll(() => {
    InitLoggerService([loggerService]);
  });
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

  it('should accept valid boolean values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.BOOLEAN)],
        value: [createLiteralValueSegment('true')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.BOOLEAN)],
        value: [createLiteralValueSegment('false')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
  });

  it('should return error for invalid integer values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('12.5')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('abc')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBe(`'Value' must be a valid integer`);
    expect(errors[1].value).toBe(`'Value' must be a valid integer`);
  });

  it('should accept valid integer values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('123')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('-456')],
      },
      {
        name: [createLiteralValueSegment('var3')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('0')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
    expect(errors[2].value).toBeUndefined();
  });

  it('should return error for invalid float values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.FLOAT)],
        value: [createLiteralValueSegment('abc')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.FLOAT)],
        value: [createLiteralValueSegment('12.3.4')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBe(`'Value' must be a valid float`);
    expect(errors[1].value).toBe(`'Value' must be a valid float`);
  });

  it('should accept valid float values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.FLOAT)],
        value: [createLiteralValueSegment('123.45')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.FLOAT)],
        value: [createLiteralValueSegment('-456.78')],
      },
      {
        name: [createLiteralValueSegment('var3')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.FLOAT)],
        value: [createLiteralValueSegment('123')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
    expect(errors[2].value).toBeUndefined();
  });

  it('should return error for invalid object values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createLiteralValueSegment('"key": "value"')], // Missing braces
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createLiteralValueSegment('{invalid json}')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBe(`'Value' must be a valid JSON object`);
    expect(errors[1].value).toBe(`'Value' must be a valid JSON object`);
  });

  it('should accept valid object values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createLiteralValueSegment('{"key": "value"}')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createLiteralValueSegment('{}')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
  });

  it('should accept single non-string expressions for objects', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createMockVariableValueSegment('@{variables("objectVar")}', 'object')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
  });

  it('should return error for invalid array values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('[invalid json]')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('{"key": "value"}')], // Not an array
      },
    ];
    const errors = validateVariables(variables);
    console.log(errors);
    expect(errors[0].value).toBe(`'Value' must be a valid JSON array`);
    expect(errors[1].value).toBe(`'Value' must be a valid JSON array`);
  });

  it('should accept valid array values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('["item1", "item2"]')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('[1, 2, 3]')],
      },
      {
        name: [createLiteralValueSegment('var3')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('[]')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
    expect(errors[2].value).toBeUndefined();
  });

  it('should skip validation for template expressions on non-object/array types', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.STRING)],
        value: [createMockVariableValueSegment('@{variables("stringVar")}', 'string')],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createMockVariableValueSegment('@{variables("intVar")}', 'integer')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
  });

  it('should validate objects and arrays even when they are template expressions', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [createLiteralValueSegment('"key": "value"')], // Invalid object, should validate even if it looks like expression
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.ARRAY)],
        value: [createLiteralValueSegment('[invalid]')], // Invalid array, should validate
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBe(`'Value' must be a valid JSON object`);
    expect(errors[1].value).toBe(`'Value' must be a valid JSON array`);
  });

  it('should skip validation for empty values', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.STRING)],
        value: [],
      },
      {
        name: [createLiteralValueSegment('var2')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined();
    expect(errors[1].value).toBeUndefined();
  });

  it('should handle multiple validation errors for single variable', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [],
        type: [],
        value: [createLiteralValueSegment('someValue')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].name).toBe(`'Name' is required`);
    expect(errors[0].type).toBe(`'Type' is required`);
    expect(errors[0].value).toBeUndefined(); // No value validation without type
  });

  it('should validate multiple variables independently', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('validVar')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.BOOLEAN)],
        value: [createLiteralValueSegment('true')],
      },
      {
        name: [createLiteralValueSegment('invalidVar')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.INTEGER)],
        value: [createLiteralValueSegment('abc')],
      },
      {
        name: [],
        type: [createLiteralValueSegment(VARIABLE_TYPE.STRING)],
        value: [createLiteralValueSegment('test')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined(); // Valid boolean
    expect(errors[1].value).toBe(`'Value' must be a valid integer`); // Invalid integer
    expect(errors[2].name).toBe(`'Name' is required`); // Missing name
    expect(errors[2].value).toBeUndefined(); // String type, no validation needed for literals
  });

  it('should handle edge case with object containing tokens', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment(VARIABLE_TYPE.OBJECT)],
        value: [
          createLiteralValueSegment('{"test": "'),
          createMockVariableValueSegment("variables('token')", 'object'),
          createLiteralValueSegment('"}'),
        ],
      },
    ];
    const errors = validateVariables(variables);
    // Should pass validation after wrapUnquotedTokens processes it
    expect(errors[0].value).toBeUndefined();
  });

  it('should handle unknown variable types gracefully', () => {
    const variables: InitializeVariableProps[] = [
      {
        name: [createLiteralValueSegment('var1')],
        type: [createLiteralValueSegment('unknownType')],
        value: [createLiteralValueSegment('someValue')],
      },
    ];
    const errors = validateVariables(variables);
    expect(errors[0].value).toBeUndefined(); // Should not crash, no validation for unknown types
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

// Mock ValueSegment interface
interface ValueSegment {
  token?: {
    type: string;
  };
}

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

describe('wrapUnquotedTokens', () => {
  let nodeMap: Map<string, ValueSegment>;

  beforeEach(() => {
    nodeMap = new Map();
  });

  describe('without nodeMap', () => {
    it('should wrap single token in quotes when no nodeMap provided', () => {
      const input = '{"test": @{variables(\'value\')}}';
      const expected = '{"test": "@{variables(\'value\')}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should wrap multiple tokens in quotes', () => {
      const input = '{"test": @{var1}@{var2}}';
      const expected = '{"test": "@{var1}@{var2}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should handle multiple properties', () => {
      const input = '{"prop1": @{token1}, "prop2": @{token2}}';
      const expected = '{"prop1": "@{token1}", "prop2": "@{token2}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should handle whitespace around colons', () => {
      const input = '{"test" : @{variables(\'value\')}}';
      const expected = '{"test" : "@{variables(\'value\')}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should not modify already quoted tokens', () => {
      const input = '{"test": "@{variables(\'value\')}"}';
      const expected = '{"test": "@{variables(\'value\')}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should not modify non-token values', () => {
      const input = '{"test": "regular string"}';
      const expected = '{"test": "regular string"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should not modify mixed token and text', () => {
      const input = '{"test": @{token}extra}';
      const expected = '{"test": @{token}extra}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });
  });

  describe('with nodeMap and string tokens', () => {
    beforeEach(() => {
      nodeMap.set("@{variables('stringVar')}", {
        token: { type: constants.SWAGGER.TYPE.STRING },
      });
    });

    it('should wrap string tokens in quotes', () => {
      const input = '{"test": @{variables(\'stringVar\')}}';
      const expected = '{"test": "@{variables(\'stringVar\')}"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });
  });

  describe('with nodeMap and non-string tokens', () => {
    beforeEach(() => {
      nodeMap.set("@{variables('numberVar')}", {
        token: { type: constants.SWAGGER.TYPE.NUMBER },
      });
      nodeMap.set("@{variables('boolVar')}", {
        token: { type: constants.SWAGGER.TYPE.BOOLEAN },
      });
      nodeMap.set("@{variables('objVar')}", {
        token: { type: constants.SWAGGER.TYPE.OBJECT },
      });
    });

    it('should use @ syntax for number tokens', () => {
      const input = '{"count": @{variables(\'numberVar\')}}';
      const expected = '{"count": "@variables(\'numberVar\')"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });

    it('should use @ syntax for boolean tokens', () => {
      const input = '{"enabled": @{variables(\'boolVar\')}}';
      const expected = '{"enabled": "@variables(\'boolVar\')"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });

    it('should use @ syntax for object tokens', () => {
      const input = '{"data": @{variables(\'objVar\')}}';
      const expected = '{"data": "@variables(\'objVar\')"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });

    it('should handle multiple properties with different token types', () => {
      nodeMap.set('@{stringToken}', {
        token: { type: constants.SWAGGER.TYPE.STRING },
      });

      const input = '{"str": @{stringToken}, "num": @{variables(\'numberVar\')}}';
      const expected = '{"str": "@{stringToken}", "num": "@variables(\'numberVar\')"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle tokens not in nodeMap', () => {
      const input = '{"test": @{unknownToken}}';
      const expected = '{"test": "@{unknownToken}"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });

    it('should handle empty nodeMap', () => {
      const input = '{"test": @{token}}';
      const expected = '{"test": "@{token}"}';
      expect(wrapUnquotedTokens(input, new Map())).toBe(expected);
    });

    it('should handle multiple tokens with mixed types', () => {
      nodeMap.set('@{token1}', {
        token: { type: constants.SWAGGER.TYPE.STRING },
      });
      nodeMap.set('@{token2}', {
        token: { type: constants.SWAGGER.TYPE.NUMBER },
      });

      const input = '{"test": @{token1}@{token2}}';
      const expected = '{"test": "@{token1}@{token2}"}';
      expect(wrapUnquotedTokens(input, nodeMap)).toBe(expected);
    });

    it('should handle whitespace in tokens', () => {
      const input = '{"test": @{variables(\'value\')}}';
      const expected = '{"test": "@{variables(\'value\')}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should handle complex property names', () => {
      const input = '{"complex-prop_name": @{token}}';
      const expected = '{"complex-prop_name": "@{token}"}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should handle nested objects structure', () => {
      const input = '{"outer": {"inner": @{token}}}';
      const expected = '{"outer": {"inner": "@{token}"}}';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });

    it('should not modify strings that do not match the pattern', () => {
      const input = 'not a json object';
      const expected = 'not a json object';
      expect(wrapUnquotedTokens(input)).toBe(expected);
    });
  });
});
