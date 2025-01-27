import { describe, it, expect } from 'vitest';
import { mapJsonTypeToCSharp, transformParameters } from '../../commands/workflows/unitTest/saveBlankUnitTest';

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
