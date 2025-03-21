import { escapeString, idDisplayCase, labelCase, canStringBeConverted, unescapeString, toPascalCase } from '../stringFunctions';
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
    expect(unescapeString('Hello\\nWorld')).toBe('Hello\nWorld');
  });

  it('unescapes carriage return characters', () => {
    expect(unescapeString('Hello\\rWorld')).toBe('Hello\rWorld');
  });

  it('unescapes tab characters', () => {
    expect(unescapeString('Hello\\tWorld')).toBe('Hello\tWorld');
  });

  it('unescapes vertical tab characters', () => {
    expect(unescapeString('Hello\\vWorld')).toBe('Hello\vWorld');
  });

  it('unescapes backslashes', () => {
    expect(unescapeString('Hello\\\\World')).toBe('Hello\\World');
  });

  it('unescapes double quotes', () => {
    expect(unescapeString('Hello\\"World"')).toBe('Hello"World"');
  });

  it('returns the same string if there are no escape sequences', () => {
    expect(unescapeString('Hello World')).toBe('Hello World');
  });

  it('handles multiple escape sequences in a row', () => {
    expect(unescapeString('Line1\\nLine2\\tTabbed')).toBe('Line1\nLine2\tTabbed');
  });

  it('handles an empty string', () => {
    expect(unescapeString('')).toBe('');
  });

  it('ignores invalid escape sequences', () => {
    expect(unescapeString('Hello\\xWorld')).toBe('Hello\\xWorld');
  });
});

describe('escapeString', () => {
  it('escapes newline characters', () => {
    expect(escapeString('Hello\nWorld')).toBe('Hello\\nWorld');
  });

  it('escapes carriage return characters', () => {
    expect(escapeString('Hello\rWorld')).toBe('Hello\\rWorld');
  });

  it('escapes tab characters', () => {
    expect(escapeString('Hello\tWorld')).toBe('Hello\\tWorld');
  });

  it('escapes vertical tab characters', () => {
    expect(escapeString('Hello\vWorld')).toBe('Hello\\vWorld');
  });

  it('returns the same string if there are no special characters', () => {
    expect(escapeString('Hello World')).toBe('Hello World');
  });

  it('escapes newline characters', () => {
    expect(escapeString('\n')).toBe('\\n');
    expect(escapeString('Test\nTest')).toBe('Test\\nTest');
  });

  it('escapes backslashes and newline characters together', () => {
    expect(escapeString('\\\n')).toBe('\\\\n');
    expect(escapeString('Test\\\nTest')).toBe('Test\\\\nTest');
  });

  it('handles an empty string', () => {
    expect(escapeString('')).toBe('');
  });

  it('does not escape characters if requireSingleQuotesWrap is true and the string is not wrapped in single quotes', () => {
    expect(escapeString('Test\nTest', true)).toBe('Test\nTest');
  });

  it('escapes characters if requireSingleQuotesWrap is true and the string is wrapped in single quotes', () => {
    expect(escapeString("'Test\nTest'", true)).toBe("'Test\\nTest'");
  });

  it('escapes multiple newlines when requireSingleQuotesWrap is true and wrapped in single quotes', () => {
    expect(escapeString("'Test\nAnotherLine\nTest'", true)).toBe(`'Test
AnotherLine
Test'`);
  });

  it('escapes characters even if requireSingleQuotesWrap is false, regardless of surrounding quotes', () => {
    expect(escapeString("'Test\nTest'", false)).toBe("'Test\\nTest'");
  });

  it('escapes characters when requireSingleQuotesWrap is undefined, regardless of surrounding quotes', () => {
    expect(escapeString("'Test\nTest'")).toBe("'Test\\nTest'");
  });

  it('escapes double quotes only when requireSingleQuotesWrap is true', () => {
    expect(escapeString(`concat('{', '"ErrorDetail"', ':', '"Exchange get failed with exchange id', '-', '"}')`, true)).toBe(
      `concat('{', '\\"ErrorDetail\\"', ':', '\\"Exchange get failed with exchange id', '-', '\\"}')`
    );
    expect(escapeString(`concat('{', '"ErrorDetail"', ':', '"Exchange get failed with exchange id', '-', '"}')`, false)).toBe(
      `concat('{', '"ErrorDetail"', ':', '"Exchange get failed with exchange id', '-', '"}')`
    );
  });

  it('escapes double quotes and newlines when requireSingleQuotesWrap is true', () => {
    expect(escapeString('\'Hello\n"World"\'', true)).toBe('\'Hello\\n\\"World\\"\'');
  });

  it('does not escape double quotes when requireSingleQuotesWrap is false', () => {
    expect(escapeString('Hello "World"', false)).toBe('Hello "World"');
  });

  it('escapes double quotes and other characters when requireSingleQuotesWrap is true and surrounded by single quotes', () => {
    expect(escapeString('\'Test\n"AnotherTest"\'', true)).toBe('\'Test\\n\\"AnotherTest\\"\'');
  });

  it('does not escape double quotes when requireSingleQuotesWrap is false', () => {
    expect(escapeString('Test "Hello"', false)).toBe('Test "Hello"');
  });
});

describe('toPascalCase', () => {
  it('should convert a valid snake_case string to PascalCase', () => {
    const input = 'example_string';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleString');
  });

  it('should capitalize the first letter of a single word', () => {
    const input = 'example';
    const result = toPascalCase(input);
    expect(result).toBe('Example');
  });

  it('should handle strings with multiple underscores', () => {
    const input = 'example__string__test';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleStringTest');
  });

  it('should handle an empty string gracefully', () => {
    const input = '';
    const result = toPascalCase(input);
    expect(result).toBe('');
  });

  it('should handle strings with leading underscores', () => {
    const input = '_example_string';
    const result = toPascalCase(input);
    expect(result).toBe('ExampleString');
  });
});
