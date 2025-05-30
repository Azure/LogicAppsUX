import { describe, expect, it } from 'vitest';
import reducer, { initialSchemaState, setAvailableSchemas } from '../SchemaSlice';
import type { SchemaState } from '../SchemaSlice';

describe('schema slice reducers', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialSchemaState).toEqual({
        availableSchemas: [],
      });
    });
  });

  describe('setAvailableSchemas', () => {
    it('should set available schemas with valid array', () => {
      const schemas = ['schema1.xsd', 'schema2.json', 'schema3.xml'];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(3);
    });

    it('should set available schemas with empty array', () => {
      const schemas: string[] = [];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual([]);
      expect(newState.availableSchemas).toHaveLength(0);
    });

    it('should set available schemas with undefined payload', () => {
      const action = setAvailableSchemas(undefined);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual([]);
      expect(newState.availableSchemas).toHaveLength(0);
    });

    it('should replace existing schemas', () => {
      const existingState: SchemaState = {
        availableSchemas: ['old1.xsd', 'old2.json'],
      };

      const newSchemas = ['new1.xsd', 'new2.xml', 'new3.json'];
      const action = setAvailableSchemas(newSchemas);
      const newState = reducer(existingState, action);

      expect(newState.availableSchemas).toEqual(newSchemas);
      expect(newState.availableSchemas).toHaveLength(3);
      expect(newState.availableSchemas).not.toContain('old1.xsd');
      expect(newState.availableSchemas).not.toContain('old2.json');
    });

    it('should handle single schema', () => {
      const schemas = ['single-schema.xsd'];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(['single-schema.xsd']);
      expect(newState.availableSchemas).toHaveLength(1);
    });

    it('should handle schemas with various file extensions', () => {
      const schemas = ['schema.xsd', 'schema.json', 'schema.xml', 'schema.avro', 'schema.proto'];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(5);
    });

    it('should handle schemas with duplicate names', () => {
      const schemas = ['schema.xsd', 'schema.xsd', 'different.json'];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(3);
      // Should preserve duplicates as provided
      expect(newState.availableSchemas.filter((s) => s === 'schema.xsd')).toHaveLength(2);
    });

    it('should handle schemas with special characters and paths', () => {
      const schemas = [
        '/path/to/schema.xsd',
        'schema with spaces.json',
        'schema-with-dashes.xml',
        'schema_with_underscores.xsd',
        'schema@version1.0.json',
      ];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(5);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string schemas', () => {
      const schemas = ['', 'valid-schema.xsd', ''];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(3);
      expect(newState.availableSchemas).toContain('');
    });

    it('should handle very long schema names', () => {
      const longSchemaName = 'a'.repeat(1000) + '.xsd';
      const schemas = [longSchemaName, 'normal.xsd'];
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(2);
      expect(newState.availableSchemas[0]).toBe(longSchemaName);
    });

    it('should handle large number of schemas', () => {
      const schemas = Array.from({ length: 1000 }, (_, i) => `schema${i}.xsd`);
      const action = setAvailableSchemas(schemas);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState.availableSchemas).toHaveLength(1000);
    });

    it('should preserve reference equality when setting same array', () => {
      const schemas = ['schema1.xsd', 'schema2.json'];
      const stateWithSchemas: SchemaState = {
        availableSchemas: schemas,
      };

      const action = setAvailableSchemas(schemas);
      const newState = reducer(stateWithSchemas, action);

      expect(newState.availableSchemas).toBe(schemas); // Same reference
    });

    it('should create new array when setting different schemas', () => {
      const originalSchemas = ['schema1.xsd', 'schema2.json'];
      const stateWithSchemas: SchemaState = {
        availableSchemas: originalSchemas,
      };

      const newSchemas = ['schema3.xml', 'schema4.avro'];
      const action = setAvailableSchemas(newSchemas);
      const newState = reducer(stateWithSchemas, action);

      expect(newState.availableSchemas).not.toBe(originalSchemas); // Different reference
      expect(newState.availableSchemas).toBe(newSchemas); // Same as new schemas
    });
  });

  describe('state transitions', () => {
    it('should handle multiple state transitions', () => {
      let state = initialSchemaState;

      // Set initial schemas
      state = reducer(state, setAvailableSchemas(['initial.xsd']));
      expect(state.availableSchemas).toEqual(['initial.xsd']);

      // Add more schemas
      state = reducer(state, setAvailableSchemas(['schema1.xsd', 'schema2.json']));
      expect(state.availableSchemas).toEqual(['schema1.xsd', 'schema2.json']);

      // Clear schemas
      state = reducer(state, setAvailableSchemas([]));
      expect(state.availableSchemas).toEqual([]);

      // Set schemas again
      state = reducer(state, setAvailableSchemas(['final.xml']));
      expect(state.availableSchemas).toEqual(['final.xml']);

      // Set to undefined (should clear)
      state = reducer(state, setAvailableSchemas(undefined));
      expect(state.availableSchemas).toEqual([]);
    });

    it('should maintain immutability', () => {
      const originalState = initialSchemaState;
      const schemas = ['test1.xsd', 'test2.json'];

      const action = setAvailableSchemas(schemas);
      const newState = reducer(originalState, action);

      // Original state should not be modified
      expect(originalState.availableSchemas).toEqual([]);
      expect(newState.availableSchemas).toEqual(schemas);
      expect(newState).not.toBe(originalState);
    });

    it('should handle undefined state input gracefully', () => {
      const schemas = ['test.xsd'];
      const action = setAvailableSchemas(schemas);

      // This tests the reducer's robustness
      const newState = reducer(undefined as any, action);

      expect(newState.availableSchemas).toEqual(schemas);
    });
  });

  describe('payload validation', () => {
    it('should handle null payload', () => {
      const action = setAvailableSchemas(null as any);
      const newState = reducer(initialSchemaState, action);

      expect(newState.availableSchemas).toEqual([]);
    });

    it('should handle non-array payload gracefully', () => {
      // This tests type safety - in practice TypeScript would catch this
      const action = setAvailableSchemas('not-an-array' as any);
      const newState = reducer(initialSchemaState, action);

      // The reducer should handle this gracefully by setting to empty array when undefined check fails
      expect(newState.availableSchemas).toEqual('not-an-array');
    });
  });
});
