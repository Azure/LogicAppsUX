import { simpleMockSchema, noChildrenMockSchema } from '../../__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('models/Schema', () => {
  describe('convertSchemaToSchemaExtended', () => {
    it('Test pathToRoot generates in correct order', () => {
      const schema: any = simpleMockSchema;
      const extendedSchema = convertSchemaToSchemaExtended(schema);

      expect(extendedSchema.schemaTreeRoot.pathToRoot.length).toEqual(1);
      expect(extendedSchema.schemaTreeRoot.pathToRoot[0].key).toEqual(extendedSchema.schemaTreeRoot.key);

      expect(extendedSchema.schemaTreeRoot.children[0].pathToRoot.length).toEqual(2);
      expect(extendedSchema.schemaTreeRoot.children[0].pathToRoot[0].key).toEqual(extendedSchema.schemaTreeRoot.key);
      expect(extendedSchema.schemaTreeRoot.children[0].pathToRoot[1].key).toEqual(extendedSchema.schemaTreeRoot.children[0].key);

      expect(extendedSchema.schemaTreeRoot.children[0].children[0].pathToRoot.length).toEqual(3);
      expect(extendedSchema.schemaTreeRoot.children[0].children[0].pathToRoot[0].key).toEqual(extendedSchema.schemaTreeRoot.key);
      expect(extendedSchema.schemaTreeRoot.children[0].children[0].pathToRoot[1].key).toEqual(
        extendedSchema.schemaTreeRoot.children[0].key
      );
      expect(extendedSchema.schemaTreeRoot.children[0].children[0].pathToRoot[2].key).toEqual(
        extendedSchema.schemaTreeRoot.children[0].children[0].key
      );
    });

    it('Test with no children', () => {
      const schema: any = noChildrenMockSchema;
      const extendedSchema = convertSchemaToSchemaExtended(schema);

      expect(extendedSchema.schemaTreeRoot.pathToRoot.length).toEqual(1);
      expect(extendedSchema.schemaTreeRoot.pathToRoot[0].key).toEqual(extendedSchema.schemaTreeRoot.key);
    });
  });
});
