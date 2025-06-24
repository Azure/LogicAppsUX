import { describe, it, expect } from 'vitest';
import { checkIfValueNeedsQuotes, quoteSelectedCustomValue } from '../CustomValue.Utils';

describe('InputDropdown utility functions', () => {
  describe('checkIfValueNeedsQuotes', () => {
    it('should return true for simple strings', () => {
      expect(checkIfValueNeedsQuotes('hello')).toBe(true);
      expect(checkIfValueNeedsQuotes('test string')).toBe(true);
      expect(checkIfValueNeedsQuotes('special!@#chars')).toBe(true);
    });

    it('should return false for numeric values', () => {
      expect(checkIfValueNeedsQuotes('123')).toBe(false);
      expect(checkIfValueNeedsQuotes('-456')).toBe(false);
      expect(checkIfValueNeedsQuotes('3.14159')).toBe(false);
      expect(checkIfValueNeedsQuotes('0')).toBe(false);
      expect(checkIfValueNeedsQuotes('-0.5')).toBe(false);
    });

    it('should return false for boolean values', () => {
      expect(checkIfValueNeedsQuotes('true')).toBe(false);
      expect(checkIfValueNeedsQuotes('false')).toBe(false);

      // Case sensitivity check
      expect(checkIfValueNeedsQuotes('TRUE')).toBe(false);
      expect(checkIfValueNeedsQuotes('FALSE')).toBe(false);
      expect(checkIfValueNeedsQuotes('True')).toBe(false);
      expect(checkIfValueNeedsQuotes('False')).toBe(false);
    });

    it('should return false for valid date strings', () => {
      expect(checkIfValueNeedsQuotes('2023-06-23')).toBe(false);
      expect(checkIfValueNeedsQuotes('2025-01-15T12:30:45')).toBe(false);
      expect(checkIfValueNeedsQuotes('June 23, 2025')).toBe(false);
    });

    it('should return true for number including spaces', () => {
      expect(checkIfValueNeedsQuotes('2023 ')).toBe(true);
    });

    it('should return true for strings that look like dates but are invalid', () => {
      expect(checkIfValueNeedsQuotes('2023-13-45')).toBe(true); // Invalid month and day
      expect(checkIfValueNeedsQuotes('Not a date')).toBe(true);
    });

    it('should handle edge cases correctly', () => {
      expect(checkIfValueNeedsQuotes('')).toBe(true); // Empty string
      expect(checkIfValueNeedsQuotes(' ')).toBe(true); // Space only

      // This looks like a number but has spaces, so it's not a valid number
      expect(checkIfValueNeedsQuotes(' 123 ')).toBe(true);
    });
  });

  describe('quoteSelectedCustomValue', () => {
    it('should return non-quoted values for numbers', () => {
      expect(quoteSelectedCustomValue('123')).toBe('123');
      expect(quoteSelectedCustomValue('-456.78')).toBe('-456.78');
    });

    it('should return non-quoted values for booleans', () => {
      expect(quoteSelectedCustomValue('true')).toBe('true');
      expect(quoteSelectedCustomValue('false')).toBe('false');
    });

    it('should return non-quoted values for valid dates', () => {
      expect(quoteSelectedCustomValue('2025-06-23')).toBe('2025-06-23');
      expect(quoteSelectedCustomValue('January 15, 2025')).toBe('January 15, 2025');
    });

    it('should wrap strings in double quotes and escape internal double quotes', () => {
      expect(quoteSelectedCustomValue('hello')).toBe('"hello"');
      expect(quoteSelectedCustomValue('hello world')).toBe('"hello world"');
      expect(quoteSelectedCustomValue('hello "world"')).toBe('"hello \\"world\\""');
    });

    it('should handle edge cases correctly', () => {
      expect(quoteSelectedCustomValue('')).toBe('""');
      expect(quoteSelectedCustomValue(' ')).toBe('" "');

      // These should be quoted because they're not valid numbers despite containing digits
      expect(quoteSelectedCustomValue('123abc')).toBe('"123abc"');
      expect(quoteSelectedCustomValue('$100')).toBe('"$100"');
    });
  });
});
