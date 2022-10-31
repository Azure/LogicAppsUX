import { parsePropertiesIntoNodeProperties } from '../Schema.Utils';

describe('utils/Schema', () => {
  describe('parsePropertiesIntoNodeProperties', () => {
    it('No input', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('');
      expect(nodeProperties.length).toEqual(0);
    });

    it('One property', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('Repeating');
      expect(nodeProperties.length).toEqual(1);
      expect(nodeProperties[0]).toEqual('Repeating');
    });

    it('Multiple properties', () => {
      const nodeProperties = parsePropertiesIntoNodeProperties('Optional, Repeating');
      expect(nodeProperties.length).toEqual(2);
      expect(nodeProperties[0]).toEqual('Optional');
      expect(nodeProperties[1]).toEqual('Repeating');
    });
  });
});
