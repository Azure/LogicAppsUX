import { escapeString, idDisplayCase, labelCase, canStringBeConverted, unescapeString } from '../stringFunctions';
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

describe('unescapeString', () => {
  it('unescapes newline characters', () => {
    const input = 'Hello\\nWorld';
    const expectedOutput = 'Hello\nWorld';
    const result = unescapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('unescapes carriage return characters', () => {
    const input = 'Hello\\rWorld';
    const expectedOutput = 'Hello\rWorld';
    const result = unescapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('unescapes tab characters', () => {
    const input = 'Hello\\tWorld';
    const expectedOutput = 'Hello\tWorld';
    const result = unescapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('unescapes vertical tab characters', () => {
    const input = 'Hello\\vWorld';
    const expectedOutput = 'Hello\vWorld';
    const result = unescapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('returns the same string if there are no escape sequences', () => {
    const input = 'Hello World';
    const expectedOutput = 'Hello World';
    const result = unescapeString(input);
    expect(result).toBe(expectedOutput);
  });
});

describe('escapeString', () => {
  it('escapes newline characters', () => {
    const input = 'Hello\nWorld';
    const expectedOutput = 'Hello\\nWorld';
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('escapes carriage return characters', () => {
    const input = 'Hello\rWorld';
    const expectedOutput = 'Hello\\rWorld';
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('escapes tab characters', () => {
    const input = 'Hello\tWorld';
    const expectedOutput = 'Hello\\tWorld';
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('escapes vertical tab characters', () => {
    const input = 'Hello\vWorld';
    const expectedOutput = 'Hello\\vWorld';
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('returns the same string if there are no special characters', () => {
    const input = 'Hello World';
    const expectedOutput = 'Hello World';
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });

  it('should correctly escape newline characters', () => {
    expect(escapeString('\n')).toEqual('\\n');
    expect(escapeString('Test\nTest')).toEqual('Test\\nTest');
  });

  it('should correctly escape backslashes and newline characters together', () => {
    expect(escapeString('\\\n')).toEqual('\\\\n');
    expect(escapeString('Test\\\nTest')).toEqual('Test\\\\nTest');
  });

  it('should handle an empty string', () => {
    expect(escapeString('')).toEqual('');
  });

  it('does not escape characters if requireSingleQuotesWrap is true and there are no surrounding single quotes', () => {
    const input = 'Test\nTest';
    const result = escapeString(input, true);
    expect(result).toBe(input); // No change, since it's not surrounded by single quotes
  });

  it('escapes characters if requireSingleQuotesWrap is true and the string is surrounded by single quotes', () => {
    const input = "'Test\nTest'";
    const expectedOutput = "'Test\\nTest'";
    const result = escapeString(input, true);
    expect(result).toBe(expectedOutput); // Should escape \n
  });

  it('escapes characters even if the string contains multiple lines when requireSingleQuotesWrap is true and surrounded by single quotes', () => {
    const input = "'Test\nAnotherLine\nTest'";
    const expectedOutput = "'Test\\nAnotherLine\\nTest'";
    const result = escapeString(input, true);
    expect(result).toBe(expectedOutput);
  });

  it('does not escape characters if requireSingleQuotesWrap is true and string is not surrounded by single quotes', () => {
    const input = 'Test\nTest';
    const result = escapeString(input, true);
    expect(result).toBe(input); // No change, since it's not surrounded by single quotes
  });

  it('escapes characters when requireSingleQuotesWrap is false regardless of surrounding quotes', () => {
    const input = "'Test\nTest'";
    const expectedOutput = "'Test\\nTest'";
    const result = escapeString(input, false);
    expect(result).toBe(expectedOutput);
  });

  it('escapes characters when requireSingleQuotesWrap is undefined regardless of surrounding quotes', () => {
    const input = "'Test\nTest'";
    const expectedOutput = "'Test\\nTest'";
    const result = escapeString(input);
    expect(result).toBe(expectedOutput);
  });
});
