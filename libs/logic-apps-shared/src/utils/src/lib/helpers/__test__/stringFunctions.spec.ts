import { escapeString, idDisplayCase, labelCase } from '../stringFunctions';
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