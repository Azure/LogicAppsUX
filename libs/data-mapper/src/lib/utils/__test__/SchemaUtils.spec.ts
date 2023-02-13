import { SchemaNodeProperty } from '../../models';
import { convertSchemaToSchemaExtended, findNodeForKey, parsePropertiesIntoNodeProperties } from '../Schema.Utils';
import { targetMockSchema } from '__mocks__/schemas';

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
      const node = findNodeForKey('/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name', extendedTarget.schemaTreeRoot);
      expect(node?.key).toEqual('/ns0:Root/Looping/Person/Name');
    });

    it('finds node for key', () => {
      const node = findNodeForKey('/ns0:Root/Looping/Person/Name', extendedTarget.schemaTreeRoot);
      expect(node?.key).toEqual('/ns0:Root/Looping/Person/Name');
    });
  });
});
