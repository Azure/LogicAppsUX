import { describe, it, expect } from 'vitest';
import { checkIfValueNeedsQuotes, quoteSelectedCustomValue } from '../CustomValue.Utils';

describe('CustomValue utility functions', () => {
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

    it('should return true for boolean values (require quotes from backend)', () => {
      expect(checkIfValueNeedsQuotes('true')).toBe(true);
      expect(checkIfValueNeedsQuotes('false')).toBe(true);

      // Case sensitivity check
      expect(checkIfValueNeedsQuotes('TRUE')).toBe(true);
      expect(checkIfValueNeedsQuotes('FALSE')).toBe(true);
      expect(checkIfValueNeedsQuotes('True')).toBe(true);
      expect(checkIfValueNeedsQuotes('False')).toBe(true);
    });

    it('should return true for date strings (require quotes from backend)', () => {
      expect(checkIfValueNeedsQuotes('2023-06-23')).toBe(true);
      expect(checkIfValueNeedsQuotes('2025-01-15T12:30:45')).toBe(true);
      expect(checkIfValueNeedsQuotes('June 23, 2025')).toBe(true);
    });

    it('should return true for strings with whitespace', () => {
      expect(checkIfValueNeedsQuotes('2023 ')).toBe(true); // trailing space
      expect(checkIfValueNeedsQuotes(' 2023')).toBe(true); // leading space
      expect(checkIfValueNeedsQuotes(' 123 ')).toBe(true); // leading and trailing spaces
      expect(checkIfValueNeedsQuotes('hello world')).toBe(true); // space in middle
    });

    it('should return true for invalid date strings', () => {
      expect(checkIfValueNeedsQuotes('2023-13-45')).toBe(true); // Invalid month and day
      expect(checkIfValueNeedsQuotes('Not a date')).toBe(true);
    });

    it('should handle edge cases correctly', () => {
      expect(checkIfValueNeedsQuotes('')).toBe(true); // Empty string (not a valid number)
      expect(checkIfValueNeedsQuotes(' ')).toBe(true); // Space only
    });

    it('should return false only for valid numbers without whitespace', () => {
      expect(checkIfValueNeedsQuotes('42')).toBe(false);
      expect(checkIfValueNeedsQuotes('0.5')).toBe(false);
      expect(checkIfValueNeedsQuotes('-3.14')).toBe(false);
      expect(checkIfValueNeedsQuotes('1e5')).toBe(false); // Scientific notation
    });

    it('should return true for non-numeric strings that contain numbers', () => {
      expect(checkIfValueNeedsQuotes('123abc')).toBe(true);
      expect(checkIfValueNeedsQuotes('$100')).toBe(true);
      expect(checkIfValueNeedsQuotes('100%')).toBe(true);
    });
  });

  describe('quoteSelectedCustomValue', () => {
    it('should return non-quoted values for numbers only', () => {
      expect(quoteSelectedCustomValue('123')).toBe('123');
      expect(quoteSelectedCustomValue('-456.78')).toBe('-456.78');
      expect(quoteSelectedCustomValue('3.14159')).toBe('3.14159');
      expect(quoteSelectedCustomValue('0')).toBe('0');
    });

    it('should wrap boolean values in double quotes (require quotes from backend)', () => {
      expect(quoteSelectedCustomValue('true')).toBe('"true"');
      expect(quoteSelectedCustomValue('false')).toBe('"false"');
      expect(quoteSelectedCustomValue('TRUE')).toBe('"TRUE"');
      expect(quoteSelectedCustomValue('FALSE')).toBe('"FALSE"');
    });

    it('should wrap date values in double quotes (require quotes from backend)', () => {
      expect(quoteSelectedCustomValue('2025-06-23')).toBe('"2025-06-23"');
      expect(quoteSelectedCustomValue('January 15, 2025')).toBe('"January 15, 2025"');
      expect(quoteSelectedCustomValue('2025-01-15T12:30:45')).toBe('"2025-01-15T12:30:45"');
    });

    it('should handle edge cases correctly', () => {
      expect(quoteSelectedCustomValue('')).toBe(''); // Empty string returns empty (based on quoteString implementation)
      expect(quoteSelectedCustomValue(' ')).toBe('" "');

      // These should be quoted because they're not valid numbers
      expect(quoteSelectedCustomValue('123abc')).toBe('"123abc"');
      expect(quoteSelectedCustomValue('$100')).toBe('"$100"');
    });

    it('should handle strings with whitespace correctly', () => {
      expect(quoteSelectedCustomValue(' 123 ')).toBe('" 123 "'); // Numbers with spaces get quoted
      expect(quoteSelectedCustomValue('2023 ')).toBe('"2023 "'); // Trailing space
      expect(quoteSelectedCustomValue(' hello')).toBe('" hello"'); // Leading space
    });

    it('should handle already quoted strings correctly', () => {
      expect(quoteSelectedCustomValue('"hello"')).toBe('"hello"'); // Already double quoted
      expect(quoteSelectedCustomValue("'hello'")).toBe('"hello"'); // Single quoted becomes double quoted
    });
  });
});
