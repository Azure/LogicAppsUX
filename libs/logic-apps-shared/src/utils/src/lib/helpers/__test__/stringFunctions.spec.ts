import { escapeString, idDisplayCase, labelCase, canStringBeConverted } from '../stringFunctions';
import { describe, it, expect } from 'vitest';
describe('label_case', () => {
  it('should replace _ with spaces', () => {
    expect(labelCase('Test_Test2')).toEqual('Test Test2');
  });

  it('should replace all _ with spaces', () => {
    expect(labelCase('Test_Test2_Test3_Test4')).toEqual('Test Test2 Test3 Test4');
  });
});

describe('idDisplayCase', () => {
  it('should correctly format a string with an ID tag', () => {
    expect(idDisplayCase('Test_ID-#Scope')).toEqual('Test ID');
  });

  it('should correctly format a string without an ID tag', () => {
    expect(idDisplayCase('Test_ID')).toEqual('Test ID');
  });

  it('should handle an empty string', () => {
    expect(idDisplayCase('')).toEqual('');
  });

  it('should handle a string with only an ID tag', () => {
    expect(idDisplayCase('-#Scope')).toEqual('');
  });
});

describe('escapeString', () => {
  it('should correctly escape backslashes', () => {
    expect(escapeString('\\')).toEqual('\\\\');
    expect(escapeString('Test\\Test')).toEqual('Test\\\\Test');
  });

  it('should correctly escape newline characters', () => {
    expect(escapeString('\n')).toEqual('\\n');
    expect(escapeString('Test\nTest')).toEqual('Test\\nTest');
  });

  it('should correctly escape backslashes and newline characters together', () => {
    expect(escapeString('\\\n')).toEqual('\\\\\\n');
    expect(escapeString('Test\\\nTest')).toEqual('Test\\\\\\nTest');
  });

  it('should handle an empty string', () => {
    expect(escapeString('')).toEqual('');
  });
});
describe('canStringBeConverted', () => {
  it('should return false for non-string inputs', () => {
    expect(canStringBeConverted(123 as any)).toBe(false);
    expect(canStringBeConverted({} as any)).toBe(false);
    expect(canStringBeConverted([] as any)).toBe(false);
    expect(canStringBeConverted(null as any)).toBe(false);
    expect(canStringBeConverted(undefined as any)).toBe(false);
  });

  it('should return false for empty or whitespace-only strings', () => {
    expect(canStringBeConverted('')).toBe(false);
    expect(canStringBeConverted(' ')).toBe(false);
    expect(canStringBeConverted('\t')).toBe(false);
    expect(canStringBeConverted('\n')).toBe(false);
  });

  it('should return true for strings that are "true", "false", or "null"', () => {
    expect(canStringBeConverted('true')).toBe(true);
    expect(canStringBeConverted('false')).toBe(true);
    expect(canStringBeConverted('null')).toBe(true);
  });

  it('should return true for strings that can be converted to a number', () => {
    expect(canStringBeConverted('123')).toBe(true);
    expect(canStringBeConverted('-456')).toBe(true);
    expect(canStringBeConverted('0')).toBe(true);
    expect(canStringBeConverted('7.89')).toBe(true);
  });

  it('should return true for strings that can be parsed as a JSON array', () => {
    expect(canStringBeConverted('["a", "b", "c"]')).toBe(true);
    expect(canStringBeConverted('[1, 2, 3]')).toBe(true);
    expect(canStringBeConverted('[]')).toBe(true);
  });

  it('should return false for strings that cannot be parsed as a JSON array', () => {
    expect(canStringBeConverted('not an array')).toBe(false);
    expect(canStringBeConverted('{ "key": "value" }')).toBe(false);
    expect(canStringBeConverted('{"a", "b", "c"}')).toBe(false);
  });
});
