import { DynamicSchemaType, DynamicValuesType } from '../../../models/operation';
import { ExtensionProperties } from '../../constants';
import { getParameterDynamicSchema, getParameterDynamicValues } from '../utils';

type SchemaObject = OpenAPIV2.SchemaObject;

describe('Parser common utilities tests', () => {
  describe('getParameterDynamicValues', () => {
    it('should prefer old, x-ms-dynamic-values extension when present', () => {
      const schema: SchemaObject = {
        [ExtensionProperties.DynamicTree]: 'dynamicTreeExtension',
        [ExtensionProperties.DynamicValues]: 'dynamicValuesExtension',
      };

      const dynamicValues = getParameterDynamicValues(schema);
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues?.type).toBe(DynamicValuesType.LegacyDynamicValues);
      expect(dynamicValues?.extension).toBe('dynamicValuesExtension');
    });

    it('should use new extensions when present in abscensce of old extension', () => {
      const schema: SchemaObject = {
        [ExtensionProperties.DynamicTree]: 'dynamicTreeExtension',
      };

      const dynamicValues = getParameterDynamicValues(schema);
      expect(dynamicValues).toBeDefined();
      expect(dynamicValues?.type).toBe(DynamicValuesType.DynamicTree);
      expect(dynamicValues?.extension).toBe('dynamicTreeExtension');
    });
  });

  describe('getParameterDynamicSchema', () => {
    it('should prefer old, x-ms-dynamic-schema extension when present', () => {
      const schema: SchemaObject = {
        [ExtensionProperties.DynamicSchema]: 'dynamicSchemaExtension',
        [ExtensionProperties.DynamicProperties]: 'dynamicPropertiesExtension',
      };

      const dynamicSchema = getParameterDynamicSchema(schema);
      expect(dynamicSchema).toBeDefined();
      expect(dynamicSchema?.type).toBe(DynamicSchemaType.LegacyDynamicSchema);
      expect(dynamicSchema?.extension).toBe('dynamicSchemaExtension');
    });

    it('should use new x-ms-dynamic-properties extension when present in abscensce of old extension', () => {
      const schema: SchemaObject = {
        [ExtensionProperties.DynamicProperties]: 'dynamicPropertiesExtension',
      };

      const dynamicSchema = getParameterDynamicSchema(schema);
      expect(dynamicSchema).toBeDefined();
      expect(dynamicSchema?.type).toBe(DynamicSchemaType.DynamicProperties);
      expect(dynamicSchema?.extension).toBe('dynamicPropertiesExtension');
    });
  });
});
