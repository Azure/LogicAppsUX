import { describe, it, expect } from 'vitest';
import { findLast } from '../Array.Utils';

describe('Array.Utils', () => {
  describe('findLast', () => {
    it('should find the last element that matches the predicate', () => {
      const array = [1, 2, 3, 4, 5, 4, 3, 2, 1];

      const result = findLast(array, (value) => value === 4);

      expect(result).toBe(4);
    });

    it('should return the last matching element, not the first', () => {
      const array = [
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
        { id: 1, name: 'third' },
      ];

      const result = findLast(array, (item) => item.id === 1);

      expect(result?.name).toBe('third');
    });

    it('should return undefined when no element matches', () => {
      const array = [1, 2, 3, 4, 5];

      const result = findLast(array, (value) => value === 10);

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const array: number[] = [];

      const result = findLast(array, (value) => value === 1);

      expect(result).toBeUndefined();
    });

    it('should provide correct index to predicate', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      const indices: number[] = [];

      findLast(array, (_, index) => {
        indices.push(index);
        return false;
      });

      // Should iterate from last to first (4, 3, 2, 1, 0)
      expect(indices).toEqual([4, 3, 2, 1, 0]);
    });

    it('should provide the original array to predicate', () => {
      const array = [1, 2, 3];
      let receivedArray: number[] = [];

      findLast(array, (_, __, arr) => {
        receivedArray = arr;
        return true;
      });

      expect(receivedArray).toBe(array);
    });

    it('should stop at first match when iterating backwards', () => {
      const array = [1, 2, 3, 4, 5];
      let callCount = 0;

      findLast(array, (value) => {
        callCount++;
        return value === 4;
      });

      // Should stop at index 3 (value 4), so only checks 5, 4 = 2 calls
      expect(callCount).toBe(2);
    });

    it('should work with string arrays', () => {
      const array = ['apple', 'banana', 'apple', 'cherry'];

      const result = findLast(array, (value) => value === 'apple');

      expect(result).toBe('apple');
    });

    it('should work with complex predicates', () => {
      const array = [
        { type: 'fruit', name: 'apple' },
        { type: 'vegetable', name: 'carrot' },
        { type: 'fruit', name: 'banana' },
        { type: 'vegetable', name: 'broccoli' },
      ];

      const result = findLast(array, (item) => item.type === 'fruit');

      expect(result?.name).toBe('banana');
    });

    it('should work with boolean values', () => {
      const array = [true, false, true, false, false];

      const result = findLast(array, (value) => value === true);

      expect(result).toBe(true);
    });

    it('should handle single element array', () => {
      const array = [42];

      const result = findLast(array, (value) => value === 42);

      expect(result).toBe(42);
    });

    it('should handle single element array with no match', () => {
      const array = [42];

      const result = findLast(array, (value) => value === 0);

      expect(result).toBeUndefined();
    });
  });
});
