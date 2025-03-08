import { replaceTemplatePlaceholders } from '../operations';
import { test, describe, expect } from 'vitest';
describe('replaceTemplatePlaceholders', () => {
  test('should replace placeholders with corresponding values', () => {
    const placeholderValues = { name: 'John', age: '25' };
    const template = 'Hello, {NAME}. You are {AGE} years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, John. You are 25 years old.');
  });

  test('should handle missing placeholder values by leaving the placeholder', () => {
    const placeholderValues = { name: 'John' };
    const template = 'Hello, {NAME}. You are {AGE} years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, John. You are {AGE} years old.');
  });

  test('should handle null placeholder values by replacing with an empty string', () => {
    const placeholderValues = { name: null, age: '25' };
    const template = 'Hello, {NAME}. You are {AGE} years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, . You are 25 years old.');
  });

  test('should handle undefined placeholder values by replacing with an empty string', () => {
    const placeholderValues = { name: undefined, age: '25' };
    const template = 'Hello, {NAME}. You are {AGE} years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, . You are 25 years old.');
  });

  test('should handle empty templates by returning an empty string', () => {
    const placeholderValues = { name: 'John', age: '25' };
    const template = '';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('');
  });

  test('should handle templates without placeholders by returning the original template', () => {
    const placeholderValues = { name: 'John', age: '25' };
    const template = 'Hello, John. You are 25 years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe(template);
  });

  test('should handle templates with nested Placeholders', () => {
    const placeholderValues = { name: 'John', age: '25' };
    const template = 'Hello, {{NAME}}. You are 25 years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, {John}. You are 25 years old.');
  });

  test('should handle templates with double nested Placeholders', () => {
    const placeholderValues = { name: 'John', age: '25' };
    const template = 'Hello, {{NAME} you are {AGE}}. You are 25 years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, {John you are 25}. You are 25 years old.');
  });

  test('should handle templates with placeholders being case insensitive', () => {
    const placeholderValues = { nAme: 'John', AGE: '25' };
    const template = 'Hello, {{name} you are {AgE}}. You are 25 years old.';
    const result = replaceTemplatePlaceholders(placeholderValues, template);
    expect(result).toBe('Hello, {John you are 25}. You are 25 years old.');
  });
});
