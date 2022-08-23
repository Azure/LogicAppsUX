import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { Schema } from '../Schema';
import { noChildrenMockSchema, simpleMockSchema } from '../__mocks__';

describe('models/Schema', () => {
  describe('convertSchemaToSchemaExtended', () => {
    it('Test pathToRoot generates in correct order', () => {
      const schema: Schema = simpleMockSchema;
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
      const schema: Schema = noChildrenMockSchema;
      const extendedSchema = convertSchemaToSchemaExtended(schema);

      expect(extendedSchema.schemaTreeRoot.pathToRoot.length).toEqual(1);
      expect(extendedSchema.schemaTreeRoot.pathToRoot[0].key).toEqual(extendedSchema.schemaTreeRoot.key);
    });
  });
});
