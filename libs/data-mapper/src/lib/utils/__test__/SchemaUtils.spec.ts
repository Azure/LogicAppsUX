import { targetMockSchema } from '../../__mocks__';
import { SchemaNodeProperty } from '../../models';
import { convertSchemaToSchemaExtended, findNodeForKey, parsePropertiesIntoNodeProperties, setWidthForSourceNodes } from '../Schema.Utils';
import { sourceSchemaNodes } from '../__mocks__';

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

  describe('setWidthForSourceNodes', () => {
    it('creates a simple indentation for one repeating node', () => {
      const sortedSourceNodes = sourceSchemaNodes;
      setWidthForSourceNodes(sortedSourceNodes);
      expect(sortedSourceNodes[0].width).toEqual(200);
      expect(sortedSourceNodes[1].width).toEqual(176);
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
