import { describe, expect, it } from 'vitest';
import { ValueSegmentType } from '../../../models/parameter';
import { convertValueType, convertKeyValueItemToSegments } from '../keyvalueitem';
import { convertSegmentsToString } from '../parsesegments';

describe('keyvalueitem utilities', () => {
  describe('convertValueType', () => {
    it('should return the specified type when type is not "any"', () => {
      const value = [{ id: '1', type: ValueSegmentType.LITERAL, value: 'test' }];
      expect(convertValueType(value, 'string')).toBe('string');
      expect(convertValueType(value, 'integer')).toBe('integer');
      expect(convertValueType(value, 'boolean')).toBe('boolean');
    });

    it('should return STRING for literal values when type is "any"', () => {
      const value = [{ id: '1', type: ValueSegmentType.LITERAL, value: 'hello' }];
      expect(convertValueType(value, 'any')).toBe('string');
    });

    it('should return STRING for compound expressions (tokens mixed with literals)', () => {
      // Simulates: @{variables('year')}-@{variables('month')}-@{variables('date')}
      const value = [
        { id: '1', type: ValueSegmentType.TOKEN, value: "variables('year')" },
        { id: '2', type: ValueSegmentType.LITERAL, value: '-' },
        { id: '3', type: ValueSegmentType.TOKEN, value: "variables('month')" },
        { id: '4', type: ValueSegmentType.LITERAL, value: '-' },
        { id: '5', type: ValueSegmentType.TOKEN, value: "variables('date')" },
      ];
      expect(convertValueType(value, 'any')).toBe('string');
      expect(convertValueType(value, undefined)).toBe('string');
    });

    it('should preserve type for single token values', () => {
      // A single token like @{variables('count')} should keep its type (e.g., for integer parameters)
      const value = [{ id: '1', type: ValueSegmentType.TOKEN, value: "variables('count')" }];
      expect(convertValueType(value, 'any')).toBe('any');
      expect(convertValueType(value, undefined)).toBe(undefined);
    });

    it('should return STRING for non-string parseable values', () => {
      // Numbers, booleans, null should not be treated as strings
      const numberValue = [{ id: '1', type: ValueSegmentType.LITERAL, value: '123' }];
      expect(convertValueType(numberValue, 'any')).toBe('any');

      const boolValue = [{ id: '1', type: ValueSegmentType.LITERAL, value: 'true' }];
      expect(convertValueType(boolValue, 'any')).toBe('any');
    });
  });

  describe('convertKeyValueItemToSegments', () => {
    it('should produce valid JSON structure for compound expression values', () => {
      const items = [
        {
          id: '1',
          key: [{ id: 'k1', type: ValueSegmentType.LITERAL, value: 'DATE' }],
          value: [
            { id: 'v1', type: ValueSegmentType.TOKEN, value: "variables('year')" },
            { id: 'v2', type: ValueSegmentType.LITERAL, value: '-' },
            { id: 'v3', type: ValueSegmentType.TOKEN, value: "variables('month')" },
          ],
        },
      ];

      const segments = convertKeyValueItemToSegments(items, 'string', 'any');
      const result = convertSegmentsToString(segments);

      // The value should be quoted since it's a compound expression
      expect(result).toContain('"DATE"');
      // The compound expression should be wrapped in quotes to produce valid JSON
      expect(result).toMatch(/"DATE"\s*:\s*"/);
    });

    it('should handle empty items', () => {
      const items: {
        id: string;
        key: { id: string; type: string; value: string }[];
        value: { id: string; type: string; value: string }[];
      }[] = [];
      const segments = convertKeyValueItemToSegments(items);
      expect(segments).toHaveLength(1);
      expect(segments[0].value).toBe('');
    });
  });
});
