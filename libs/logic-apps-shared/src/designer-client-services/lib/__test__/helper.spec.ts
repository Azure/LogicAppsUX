import { describe, it, expect } from 'vitest';
import { unwrapPaginatedResponse } from '../helpers';

describe('unwrapPaginatedResponse', () => {
  it('should return response.value if __usedNextPage is true and value is an array', () => {
    const response = { value: [1, 2, 3], __usedNextPage: true };
    expect(unwrapPaginatedResponse(response)).toEqual([1, 2, 3]);
  });

  it('should return response.value if __usedNextPage is true and value is a string', () => {
    const response = { value: 'string value', __usedNextPage: true };
    expect(unwrapPaginatedResponse(response)).toBe('string value');
  });

  it('should return response.value if __usedNextPage is true and value is a number', () => {
    const response = { value: 42, __usedNextPage: true };
    expect(unwrapPaginatedResponse(response)).toBe(42);
  });

  it('should return response.value if __usedNextPage is true and value is an object', () => {
    const obj = { key: 'value' };
    const response = { value: obj, __usedNextPage: true };
    expect(unwrapPaginatedResponse(response)).toBe(obj);
  });

  it('should return response.value if __usedNextPage is true and value is a boolean', () => {
    const response = { value: false, __usedNextPage: true };
    expect(unwrapPaginatedResponse(response)).toBe(false);
  });

  it('should return the whole response if __usedNextPage is false', () => {
    const response = { value: [1, 2, 3], __usedNextPage: false };
    expect(unwrapPaginatedResponse(response)).toEqual(response);
  });

  it('should return the whole response if __usedNextPage is missing', () => {
    const response = { value: [1, 2, 3] };
    expect(unwrapPaginatedResponse(response)).toEqual(response);
  });

  it('should return null if response is null', () => {
    expect(unwrapPaginatedResponse(null)).toBe(null);
  });

  it('should return undefined if response is undefined', () => {
    expect(unwrapPaginatedResponse(undefined)).toBe(undefined);
  });
});
