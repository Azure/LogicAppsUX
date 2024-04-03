import { convertSchemaToSchemaExtended, findNodeForKey, getFileNameAndPath, parsePropertiesIntoNodeProperties } from '../Schema.Utils';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import { targetMockSchema } from '../../../.../../__mocks__/schemas';

describe('utils/Schema', () => {
  describe('parsePropertiesIntoNodeProperties', () => {
    it('No input', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('');
      expect(nodeProperties.length).toEqual(0);
    });

    it('One property', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('Repeating');
      expect(nodeProperties.length).toEqual(1);
      expect(nodeProperties[0]).toEqual(SchemaNodeProperty.Repeating);
    });

    it('Multiple properties', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('Optional, Repeating');
      expect(nodeProperties.length).toEqual(2);
      expect(nodeProperties[0]).toEqual(SchemaNodeProperty.Optional);
      expect(nodeProperties[1]).toEqual(SchemaNodeProperty.Repeating);
    });
  });

  describe('findNodeForKey', () => {
    const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

    it('finds loop value for key', () => {
      const node = findNodeForKey('/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name', extendedTarget.schemaTreeRoot, false);
      expect(node?.key).toEqual('/ns0:Root/Looping/Person/Name');
    });

    it('finds node for key', () => {
      const node = findNodeForKey('/ns0:Root/Looping/Person/Name', extendedTarget.schemaTreeRoot, false);
      expect(node?.key).toEqual('/ns0:Root/Looping/Person/Name');
    });
  });

  describe('convertSchemaToSchemaExtended', () => {
    it('creates generated fields', () => {
      const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

      expect(extendedTarget.schemaTreeRoot.pathToRoot.length).toEqual(1);
      expect(extendedTarget.schemaTreeRoot.parentKey).toBeUndefined();

      expect(extendedTarget.schemaTreeRoot.children[0].pathToRoot.length).toEqual(2);
      expect(extendedTarget.schemaTreeRoot.children[0].parentKey).toEqual(extendedTarget.schemaTreeRoot.key);

      expect(extendedTarget.schemaTreeRoot.children[0].children[0].pathToRoot.length).toEqual(3);
      expect(extendedTarget.schemaTreeRoot.children[0].children[0].parentKey).toEqual(extendedTarget.schemaTreeRoot.children[0].key);
    });
  });

  describe('getFileNameAndPath', () => {
    it('separates simple name from path', () => {
      const fullPath = 'NestedFolder\\NestedSchema.xsd';
      const [fileName, filePath] = getFileNameAndPath(fullPath);
      expect(fileName).toEqual('NestedSchema.xsd');
      expect(filePath).toEqual('NestedFolder/');
    });
  });
});
