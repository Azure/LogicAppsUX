import { describe, it, expect } from 'vitest';
import { loadMapDefinition } from '../MapDefinition.Utils';

describe('MapDefinition.Utils', () => {
  describe('loadMapDefinition', () => {
    it('should return empty object when input is undefined', () => {
      const result = loadMapDefinition(undefined);

      expect(result).toEqual({});
    });

    it('should return empty object when input is empty string', () => {
      const result = loadMapDefinition('');

      expect(result).toEqual({});
    });

    it('should parse simple YAML map definition', () => {
      const yamlString = `
$version: "1.0"
$input: xml
$output: xml
/Root/Name: /Source/Name
`;
      const result = loadMapDefinition(yamlString);

      // Note: quoted strings preserve their quotes
      expect(result['$version']).toBe('"1.0"');
      expect(result['$input']).toBe('xml');
      expect(result['$output']).toBe('xml');
      expect(result['/Root/Name']).toBe('/Source/Name');
    });

    it('should parse nested YAML structure', () => {
      const yamlString = `
$version: "1.0"
/Root:
  /Name: /Source/Name
  /Address:
    /City: /Source/City
`;
      const result = loadMapDefinition(yamlString);

      // Note: quoted strings preserve their quotes
      expect(result['$version']).toBe('"1.0"');
      expect(result['/Root']).toBeDefined();
      expect(result['/Root']['/Name']).toBe('/Source/Name');
      expect(result['/Root']['/Address']['/City']).toBe('/Source/City');
    });

    it('should handle double-quoted string values', () => {
      const yamlString = `
/Root/Description: "Hello World"
`;
      const result = loadMapDefinition(yamlString);

      expect(result['/Root/Description']).toBe('"Hello World"');
    });

    it('should handle function expressions', () => {
      const yamlString = `
/Root/FullName: concat(/Source/FirstName, " ", /Source/LastName)
`;
      const result = loadMapDefinition(yamlString);

      expect(result['/Root/FullName']).toBe('concat(/Source/FirstName, " ", /Source/LastName)');
    });

    it('should handle array of objects in map definition', () => {
      const yamlString = `
$version: "1.0"
/Root/Items:
  - /Name: /Source/Item1/Name
  - /Name: /Source/Item2/Name
`;
      const result = loadMapDefinition(yamlString);

      // Note: quoted strings preserve their quotes
      expect(result['$version']).toBe('"1.0"');
      expect(Array.isArray(result['/Root/Items'])).toBe(true);
      expect(result['/Root/Items']).toHaveLength(2);
    });

    it('should handle complex nested structures with mixed types', () => {
      const yamlString = `
$version: "1.0"
$input: xml
$output: xml
/ns0:Root:
  /DirectTranslation:
    /Employee:
      /Name: /ns0:Source/Name
      /Age: /ns0:Source/Age
`;
      const result = loadMapDefinition(yamlString);

      // Note: quoted strings preserve their quotes
      expect(result['$version']).toBe('"1.0"');
      expect(result['/ns0:Root']['/DirectTranslation']['/Employee']['/Name']).toBe('/ns0:Source/Name');
      expect(result['/ns0:Root']['/DirectTranslation']['/Employee']['/Age']).toBe('/ns0:Source/Age');
    });

    it('should preserve escaped quotes in values', () => {
      const yamlString = `
/Root/Value: "Value with \\"quotes\\""
`;
      const result = loadMapDefinition(yamlString);

      // The function processes escaped quotes
      expect(result['/Root/Value']).toContain('quotes');
    });

    it('should handle boolean values', () => {
      const yamlString = `
$version: "1.0"
enabled: true
disabled: false
`;
      const result = loadMapDefinition(yamlString);

      expect(result['enabled']).toBe(true);
      expect(result['disabled']).toBe(false);
    });

    it('should handle numeric values', () => {
      const yamlString = `
$version: "1.0"
count: 42
price: 19.99
`;
      const result = loadMapDefinition(yamlString);

      expect(result['count']).toBe(42);
      expect(result['price']).toBe(19.99);
    });

    it('should handle null values', () => {
      const yamlString = `
$version: "1.0"
nullValue: null
emptyValue: ~
`;
      const result = loadMapDefinition(yamlString);

      expect(result['nullValue']).toBeNull();
      expect(result['emptyValue']).toBeNull();
    });

    it('should handle for-each loop syntax', () => {
      const yamlString = `
$for(/Source/Items/Item):
  /Target/Items/Item:
    /Name: Name
    /Value: Value
`;
      const result = loadMapDefinition(yamlString);

      expect(result['$for(/Source/Items/Item)']).toBeDefined();
    });

    it('should handle conditional if syntax', () => {
      const yamlString = `
$if(greater-than(/Source/Value, 0)):
  /Target/Positive: /Source/Value
`;
      const result = loadMapDefinition(yamlString);

      expect(result['$if(greater-than(/Source/Value, 0))']).toBeDefined();
    });
  });
});
