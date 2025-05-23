import {
  escapeString,
  idDisplayCase,
  labelCase,
  canStringBeConverted,
  unescapeString,
  toPascalCase,
  wrapStringifiedTokenSegments,
} from '../stringFunctions';
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
  it('escapes newline inside single quotes', () => {
    expect(escapeString("concat('line\nbreak')")).toBe("concat('line\\nbreak')");
  });

  it('escapes carriage return inside single quotes', () => {
    expect(escapeString("concat('line\rreturn')")).toBe("concat('line\\rreturn')");
  });

  it('escapes tab inside single quotes', () => {
    expect(escapeString("concat('tab\tvalue')")).toBe("concat('tab\\tvalue')");
  });

  it('escapes vertical tab inside single quotes', () => {
    expect(escapeString("concat('vertical\vtab')")).toBe("concat('vertical\\vtab')");
  });

  it('escapes double quote inside single quotes', () => {
    expect(escapeString("concat('quote\"test')")).toBe("concat('quote\\\"test')");
  });

  it('escapes backslash inside single quotes', () => {
    expect(escapeString("concat('path\\to\\file')")).toBe("concat('path\\\\to\\\\file')");
  });

  it('does not escape special characters outside of single quotes', () => {
    expect(escapeString('concat(\n\t\r\v)')).toBe('concat(\n\t\r\v)');
  });

  it('does not escape if special characters are outside single quotes', () => {
    expect(escapeString("'\n'\n'\t'")).toBe("'\\n'\n'\\t'");
  });

  it('handles input with no quotes', () => {
    expect(escapeString('plain text')).toBe('plain text');
  });

  it('handles input with only special characters inside quotes', () => {
    expect(escapeString("concat('\n\r\t\v\"\\')")).toBe("concat('\\n\\r\\t\\v\\\"\\\\')");
  });

  it('handles multiple quoted sections correctly', () => {
    expect(escapeString("before 'line\none' middle 'line\ttwo' after")).toBe("before 'line\\none' middle 'line\\ttwo' after");
  });

  it('handles uneven quotes gracefully (simple toggle)', () => {
    expect(escapeString("'open\nquote")).toBe("'open\\nquote");
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

describe('wrapStringifiedTokenSegments', () => {
  it('wraps a simple unquoted token', () => {
    const input = `{"key": @{myValue}}`;
    const expected = `{"key": "@{myValue}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('wraps a quoted token and escapes it properly', () => {
    const input = `{"key": "@{my\\"quoted\\"Value}"}`;
    const expected = `{"key": "@{my\\\\\\"quoted\\\\\\"Value}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('escapes newlines and carriage returns in token', () => {
    const input = `{"key": "@{line1\\nline2\\rline3}"}`;
    const expected = `{"key": "@{line1\\\\nline2\\\\rline3}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('escapes backslashes and tabs inside token', () => {
    const input = `{"key": "@{line\\twith\\vtabs\\backslashes}"}`;
    const expected = `{"key": "@{line\\\\twith\\\\vtabs\\\\backslashes}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('handles mixed quoted and unquoted tokens', () => {
    const input = `{"a": @{x}, "b": "@{y}"}`;
    const expected = `{"a": "@{x}", "b": "@{y}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('ignores properties without token expressions', () => {
    const input = `{"key": "value"}`;
    const expected = `{"key": "value"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('handles malformed token-like strings safely', () => {
    const input = `{"key": "@{incomplete"}`;
    const expected = `{"key": "@{incomplete"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });

  it('normalizes newline and carriage return within tokens before escaping', () => {
    const input = `{"key": "@{line1\nline2\rline3}"}`;
    const expected = String.raw`{"key": "@{line1\\nline2\\rline3}"}`;
    expect(wrapStringifiedTokenSegments(input)).toBe(expected);
  });
});
