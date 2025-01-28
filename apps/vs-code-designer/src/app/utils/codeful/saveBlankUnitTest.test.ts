import { describe, it, expect } from 'vitest';
import {
  buildClassDefinition,
  generateClassCode,
  generateCSharpClasses,
  isMockable,
  mapJsonTypeToCSharp,
  parseUnitTestOutputs,
  transformParameters,
} from '../../commands/workflows/unitTest/saveBlankUnitTest';

describe('transformParameters', () => {
  it('should clean keys and retain only allowed fields', () => {
    const input = {
      'outputs.$.field1': { type: 'string', title: 'Field 1', format: 'text', description: 'First field' },
      'outputs.$.field2': { type: 'integer', title: 'Field 2', extraField: 'ignored' },
    };

    const expected = {
      field1: { type: 'string', title: 'Field 1', format: 'text', description: 'First field' },
      field2: { type: 'integer', title: 'Field 2' },
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should build nested structures from dotted keys', () => {
    const input = {
      'outputs.$.parent.child1': { type: 'string', title: 'Child 1' },
      'outputs.$.parent.child2': { type: 'integer', title: 'Child 2', format: 'number' },
    };

    const expected = {
      parent: {
        child1: { type: 'string', title: 'Child 1' },
        child2: { type: 'integer', title: 'Child 2', format: 'number' },
      },
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should skip keys not containing allowed fields', () => {
    const input = {
      'outputs.$.field1': { irrelevantField: 'ignored', anotherIrrelevantField: 'also ignored' },
    };

    const expected = {
      field1: {},
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should handle keys starting with "body.$."', () => {
    const input = {
      'body.$.field1': { type: 'string', title: 'Field 1' },
    };

    const expected = {
      body: {
        field1: { type: 'string', title: 'Field 1' },
      },
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should merge existing keys with additional fields', () => {
    // Now we include the original type/title so transformParameters can see them.
    const input = {
      'outputs.$.field1': {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'Updated description',
      },
    };

    const expected = {
      field1: {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'Updated description',
      },
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should handle an empty input object', () => {
    const input = {};

    const expected = {};

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });

  it('should handle deeply nested keys correctly', () => {
    const input = {
      'outputs.$.parent.child1.grandchild1': { type: 'string', title: 'Grandchild 1' },
      'outputs.$.parent.child1.grandchild2': { type: 'integer', title: 'Grandchild 2' },
    };

    const expected = {
      parent: {
        child1: {
          grandchild1: { type: 'string', title: 'Grandchild 1' },
          grandchild2: { type: 'integer', title: 'Grandchild 2' },
        },
      },
    };

    const result = transformParameters(input);

    expect(result).toEqual(expected);
  });
});

describe('mapJsonTypeToCSharp', () => {
  it('should map "string" to "string"', () => {
    const result = mapJsonTypeToCSharp('string');
    expect(result).toBe('string');
  });

  it('should map "integer" to "int"', () => {
    const result = mapJsonTypeToCSharp('integer');
    expect(result).toBe('int');
  });

  it('should map "number" to "double"', () => {
    const result = mapJsonTypeToCSharp('number');
    expect(result).toBe('double');
  });

  it('should map "boolean" to "bool"', () => {
    const result = mapJsonTypeToCSharp('boolean');
    expect(result).toBe('bool');
  });

  it('should map "array" to "List<object>"', () => {
    const result = mapJsonTypeToCSharp('array');
    expect(result).toBe('List<object>');
  });

  it('should map "object" to "JObject"', () => {
    const result = mapJsonTypeToCSharp('object');
    expect(result).toBe('JObject');
  });

  it('should map "any" to "JObject"', () => {
    const result = mapJsonTypeToCSharp('any');
    expect(result).toBe('JObject');
  });

  it('should map "date-time" to "DateTime"', () => {
    const result = mapJsonTypeToCSharp('date-time');
    expect(result).toBe('DateTime');
  });

  it('should map an unknown type to "JObject"', () => {
    const result = mapJsonTypeToCSharp('unknownType');
    expect(result).toBe('JObject');
  });
});

// Mock data for tests
const mockUnitTestDefinition = {
  operationInfo: {
    operation1: { type: 'Http' },
    operation2: { type: 'Manual' },
  },
  outputParameters: {
    operation1: {
      outputs: {
        'outputs.$.key1': { type: 'string', description: 'Key 1 description' },
        'outputs.$.key2': { type: 'integer', description: 'Key 2 description' },
      },
    },
    operation2: {
      outputs: {
        'outputs.$.key3': { type: 'boolean', description: 'Key 3 description' },
      },
    },
  },
};

describe('parseUnitTestOutputs', () => {
  it('should parse and transform output parameters correctly', async () => {
    const result = await parseUnitTestOutputs(mockUnitTestDefinition);

    expect(result.operationInfo).toEqual(mockUnitTestDefinition.operationInfo);
    expect(result.outputParameters.operation1.outputs).toEqual({
      Key1: { type: 'string', description: 'Key 1 description' },
      Key2: { type: 'integer', description: 'Key 2 description' },
    });
    expect(result.outputParameters.operation2.outputs).toEqual({
      Key3: { type: 'boolean', description: 'Key 3 description' },
    });
  });
});

describe('isMockable', () => {
  it('should return true for mockable action types', () => {
    expect(isMockable('Http', false)).toBe(true); // Mockable action
    expect(isMockable('ApiManagement', false)).toBe(true); // Mockable action
    expect(isMockable('Manual', true)).toBe(true); // Mockable trigger
  });

  it('should return false for non-mockable action types', () => {
    expect(isMockable('NonMockableType', false)).toBe(false);
    expect(isMockable('AnotherType', true)).toBe(false);
  });
});

describe('transformParameters', () => {
  it('should clean keys and keep only allowed fields', () => {
    const params = {
      'outputs.$.key1': { type: 'string', description: 'Key 1 description', extraField: 'ignored' },
      'body.$.key2': { type: 'integer', title: 'Key 2 title' },
    };
    const transformed = transformParameters(params);

    expect(transformed).toEqual({
      Key1: { type: 'string', description: 'Key 1 description' },
      Body: {
        Key2: { type: 'integer', title: 'Key 2 title' },
      },
    });
  });
});

describe('buildClassDefinition', () => {
  it('should build a class definition for an object', () => {
    const classDef = buildClassDefinition('RootClass', {
      type: 'object',
      key1: { type: 'string', description: 'Key 1 description' },
      nested: {
        type: 'object',
        nestedKey: { type: 'boolean', description: 'Nested key description' },
      },
    });

    expect(classDef).toEqual({
      className: 'RootClass',
      description: null,
      properties: [
        { propertyName: 'Key1', propertyType: 'string', description: 'Key 1 description', isObject: false },
        { propertyName: 'Nested', propertyType: 'RootClassNested', description: null, isObject: true },
      ],
      children: [
        {
          className: 'RootClassNested',
          description: null,
          properties: [{ propertyName: 'NestedKey', propertyType: 'bool', description: 'Nested key description', isObject: false }],
          children: [],
        },
      ],
    });
  });
});

describe('generateCSharpClasses', () => {
  it('should generate C# class code from a class definition', () => {
    const classCode = generateCSharpClasses('NamespaceName', 'RootClass', {
      type: 'object',
      key1: { type: 'string', description: 'Key 1 description' },
    });

    expect(classCode).toContain('public class RootClass');
    expect(classCode).toContain('public string Key1 { get; set; }');
  });
});

describe('generateClassCode', () => {
  it('should generate a C# class string for a class definition', () => {
    const classDef = {
      className: 'TestClass',
      description: 'A test class',
      properties: [
        { propertyName: 'Property1', propertyType: 'string', description: 'A string property', isObject: false },
        { propertyName: 'Property2', propertyType: 'int', description: 'An integer property', isObject: false },
      ],
      children: [],
    };

    const classCode = generateClassCode(classDef);
    expect(classCode).toContain('public class TestClass');
    expect(classCode).toContain('public string Property1 { get; set; }');
    expect(classCode).toContain('public int Property2 { get; set; }');
  });
});

describe('mapJsonTypeToCSharp', () => {
  it('should map JSON types to corresponding C# types', () => {
    expect(mapJsonTypeToCSharp('string')).toBe('string');
    expect(mapJsonTypeToCSharp('integer')).toBe('int');
    expect(mapJsonTypeToCSharp('boolean')).toBe('bool');
    expect(mapJsonTypeToCSharp('array')).toBe('List<object>');
    expect(mapJsonTypeToCSharp('object')).toBe('JObject');
  });
});
