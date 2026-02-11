import { describe, it, expect } from 'vitest';
import schemaReducer, { setAvailableSchemas, initialSchemaState, type SchemaState } from '../SchemaSlice';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';

describe('SchemaSlice', () => {
  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = schemaReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialSchemaState);
    });

    it('should have empty availableSchemas array as default', () => {
      const result = schemaReducer(undefined, { type: 'unknown' });

      expect(result.availableSchemas).toEqual([]);
    });
  });

  describe('setAvailableSchemas action', () => {
    it('should set available schemas when payload is provided', () => {
      const mockSchemas: IFileSysTreeItem[] = [
        { name: 'schema1.xsd', type: 'file', fullPath: '/schemas/schema1.xsd' },
        { name: 'schema2.xsd', type: 'file', fullPath: '/schemas/schema2.xsd' },
      ];

      const result = schemaReducer(initialSchemaState, setAvailableSchemas(mockSchemas));

      expect(result.availableSchemas).toEqual(mockSchemas);
      expect(result.availableSchemas).toHaveLength(2);
    });

    it('should replace existing schemas with new ones', () => {
      const existingState: SchemaState = {
        availableSchemas: [{ name: 'old.xsd', type: 'file', fullPath: '/old.xsd' }],
      };
      const newSchemas: IFileSysTreeItem[] = [{ name: 'new.xsd', type: 'file', fullPath: '/new.xsd' }];

      const result = schemaReducer(existingState, setAvailableSchemas(newSchemas));

      expect(result.availableSchemas).toEqual(newSchemas);
      expect(result.availableSchemas).toHaveLength(1);
      expect(result.availableSchemas[0].name).toBe('new.xsd');
    });

    it('should set empty array when payload is undefined', () => {
      const existingState: SchemaState = {
        availableSchemas: [{ name: 'schema.xsd', type: 'file', fullPath: '/schema.xsd' }],
      };

      const result = schemaReducer(existingState, setAvailableSchemas(undefined as unknown as IFileSysTreeItem[]));

      expect(result.availableSchemas).toEqual([]);
    });

    it('should set empty array when payload is null', () => {
      const existingState: SchemaState = {
        availableSchemas: [{ name: 'schema.xsd', type: 'file', fullPath: '/schema.xsd' }],
      };

      const result = schemaReducer(existingState, setAvailableSchemas(null as unknown as IFileSysTreeItem[]));

      expect(result.availableSchemas).toEqual([]);
    });

    it('should handle empty array payload', () => {
      const existingState: SchemaState = {
        availableSchemas: [{ name: 'schema.xsd', type: 'file', fullPath: '/schema.xsd' }],
      };

      const result = schemaReducer(existingState, setAvailableSchemas([]));

      expect(result.availableSchemas).toEqual([]);
    });

    it('should handle nested directory structure', () => {
      const mockSchemas: IFileSysTreeItem[] = [
        {
          name: 'schemas',
          type: 'directory',
          fullPath: '/schemas',
          children: [
            { name: 'source.xsd', type: 'file', fullPath: '/schemas/source.xsd' },
            { name: 'target.xsd', type: 'file', fullPath: '/schemas/target.xsd' },
          ],
        },
      ];

      const result = schemaReducer(initialSchemaState, setAvailableSchemas(mockSchemas));

      expect(result.availableSchemas).toEqual(mockSchemas);
      expect(result.availableSchemas[0].children).toHaveLength(2);
    });
  });
});
