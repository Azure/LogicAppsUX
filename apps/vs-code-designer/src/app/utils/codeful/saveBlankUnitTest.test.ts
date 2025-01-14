import { describe, it, expect } from 'vitest';
import { transformParameters } from '../../commands/workflows/unitTest/saveBlankUnitTest';

// apps\vs-code-designer\src\app\commands\workflows\unitTest\saveBlankUnitTest.ts
describe('transformParameters', () => {
  it('transforms flat parameters to a nested structure', () => {
    const params = {
      'outputs.$.key1': { type: 'string', description: 'A string field' },
      'outputs.$.nested.key2': { type: 'number', description: 'A number field' },
    };

    const result = transformParameters(params);

    expect(result).toEqual({
      key1: {
        type: 'string',
        description: 'A string field',
      },
      nested: {
        key2: {
          type: 'number',
          description: 'A number field',
        },
      },
    });
  });

  it('ignores fields not in the allowed list', () => {
    const params = {
      'outputs.$.key1': { type: 'string', extra: 'Ignored field' },
      'outputs.$.key2': { format: 'uuid', irrelevant: 'Ignored field' },
    };

    const result = transformParameters(params);

    expect(result).toEqual({
      key1: {
        type: 'string',
      },
      key2: {
        format: 'uuid',
      },
    });
  });

  it('merges fields for existing nested keys', () => {
    const params = {
      'outputs.$.nested.key1': { type: 'string', description: 'First description' },
      'outputs.$.nested.key2': { type: 'number', format: 'integer' },
    };

    const result = transformParameters(params);

    expect(result).toEqual({
      nested: {
        key1: {
          type: 'string',
          description: 'First description',
          title: 'Updated Title',
        },
        key2: {
          type: 'number',
          format: 'integer',
        },
      },
    });
  });

  it('returns an empty object for invalid inputs', () => {
    const params = {
      'outputs.$.invalidKey': { irrelevant: 'Ignored field' }, // No allowed fields
    };

    const result = transformParameters(params);

    expect(result).toEqual({});
  });

  it('handles keys without nested structure', () => {
    const params = {
      'outputs.$.simpleKey': { type: 'boolean', description: 'A boolean field' },
    };

    const result = transformParameters(params);

    expect(result).toEqual({
      simpleKey: {
        type: 'boolean',
        description: 'A boolean field',
      },
    });
  });

  it('handles deeply nested structures', () => {
    const params = {
      'outputs.$.level1.level2.level3.key': { type: 'string', description: 'Deeply nested field' },
    };

    const result = transformParameters(params);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            key: {
              type: 'string',
              description: 'Deeply nested field',
            },
          },
        },
      },
    });
  });
});
