import { getTitleOrSummary, isOneOf } from '../schema';

describe('OpenAPI schema utilities', () => {
  describe('getTitleOrSummary', () => {
    test.each<[OpenAPIV2.Schema, string | undefined]>([
      [{}, undefined],
      [{ id: 'foo' }, undefined],
      [{ title: 'bar' }, 'bar'],
      [{ 'x-ms-summary': 'baz' }, 'baz'],
      [{ title: 'bar', 'x-ms-summary': 'baz' }, 'bar'],
    ])('returns the correct value', (schema, expected) => {
      expect(getTitleOrSummary(schema)).toBe(expected);
    });
  });

  describe('isOneOf', () => {
    test.each<[OpenAPIV2.Schema, boolean]>([
      [{}, false],
      [{ oneOf: undefined }, false],
      [{ oneOf: [] }, true],
      [{ oneOf: [{}, {}] }, true],
    ])('returns the correct value', (schema, expected) => {
      expect(isOneOf(schema)).toBe(expected);
    });
  });
});
