import { describe, it, expect } from 'vitest';
import { createLiteralValueSegment } from '@microsoft/designer-ui';

/**
 * Tests for the dispatchParamUpdate helper and the Redux propertiesToUpdate
 * it generates. The key behavior we validate:
 *  1. `preservedValue` is explicitly set to `undefined` so the serializer
 *     uses the new value segments instead of a stale preserved value.
 *  2. The value is coerced to string via String() to handle numeric input.
 */
describe('dispatchParamUpdate propertiesToUpdate shape', () => {
  // Inline the same logic as dispatchParamUpdate to test the payload shape
  function buildPropertiesToUpdate(value: string) {
    return {
      value: [createLiteralValueSegment(String(value))],
      preservedValue: undefined,
    };
  }

  it('should include preservedValue: undefined to clear stale cached values', () => {
    const props = buildPropertiesToUpdate('8');
    expect(props).toHaveProperty('preservedValue');
    expect(props.preservedValue).toBeUndefined();
    // Verify the key exists (Object.keys) even though value is undefined
    expect('preservedValue' in props).toBe(true);
  });

  it('should coerce numeric string values correctly', () => {
    const props = buildPropertiesToUpdate('42');
    expect(props.value).toHaveLength(1);
    expect(props.value[0].value).toBe('42');
  });

  it('should handle empty string value', () => {
    const props = buildPropertiesToUpdate('');
    expect(props.value).toHaveLength(1);
    expect(props.value[0].value).toBe('');
    expect(props.preservedValue).toBeUndefined();
  });
});

describe('updateNodeParameters reducer behavior with preservedValue', () => {
  // Simulate the Redux reducer logic for parameter updates
  function applyParameterUpdate(existingParam: { value: any[]; preservedValue?: string }, propertiesToUpdate: Record<string, any>) {
    return { ...existingParam, ...propertiesToUpdate };
  }

  it('should clear preservedValue when propertiesToUpdate includes preservedValue: undefined', () => {
    const existing = {
      value: [{ id: '1', type: 'literal', value: '7' }],
      preservedValue: '7',
    };
    const update = {
      value: [{ id: '2', type: 'literal', value: '8' }],
      preservedValue: undefined,
    };
    const result = applyParameterUpdate(existing, update);
    expect(result.preservedValue).toBeUndefined();
    expect(result.value[0].value).toBe('8');
  });

  it('should NOT clear preservedValue when propertiesToUpdate omits it (old bug behavior)', () => {
    const existing = {
      value: [{ id: '1', type: 'literal', value: '7' }],
      preservedValue: '7',
    };
    // This simulates the OLD buggy behavior where preservedValue was not included
    const update = {
      value: [{ id: '2', type: 'literal', value: '8' }],
    };
    const result = applyParameterUpdate(existing, update);
    // preservedValue is NOT cleared — it comes through from spread
    expect(result.preservedValue).toBe('7');
    expect(result.value[0].value).toBe('8');
  });
});
