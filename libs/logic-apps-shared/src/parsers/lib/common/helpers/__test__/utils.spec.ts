import { DynamicSchemaType, DynamicValuesType } from '../../../models/operation';
import { ExtensionProperties } from '../../constants';
import { getParameterDynamicSchema, getParameterDynamicValues, getEditorOptionsForParameter } from '../utils';
import type { OpenAPIV2 } from '../../../../../utils/src';

type SchemaObject = OpenAPIV2.SchemaObject;
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
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

  describe('getEditorOptionsForParameter', () => {
    it('should preserve multiSelect and serialization when dynamic values are present', () => {
      const schema: SchemaObject = {
        type: 'array',
        [ExtensionProperties.EditorOptions]: {
          multiSelect: true,
          titleSeparator: ',',
          serialization: {
            valueType: 'array',
          },
        },
        [ExtensionProperties.DynamicList]: {
          dynamicState: {
            apiType: 'mcp',
            operationId: 'listMcpTools',
          },
        },
      };

      const dynamicValues = getParameterDynamicValues(schema);
      const editorOptions = getEditorOptionsForParameter(schema, dynamicValues, undefined);

      expect(editorOptions).toBeDefined();
      expect(editorOptions.multiSelect).toBe(true);
      expect(editorOptions.serialization).toEqual({ valueType: 'array' });
      expect(editorOptions.options).toEqual([]);
    });

    it('should return editorOptions as-is when no dynamic values or enum', () => {
      const schema: SchemaObject = {
        type: 'string',
        [ExtensionProperties.EditorOptions]: {
          someOption: 'value',
        },
      };

      const editorOptions = getEditorOptionsForParameter(schema, undefined, undefined);

      expect(editorOptions).toEqual({ someOption: 'value' });
    });

    it('should preserve editorOptions when static enum is present', () => {
      const schema: SchemaObject = {
        type: 'string',
        [ExtensionProperties.EditorOptions]: {
          multiSelect: true,
        },
      };
      const enumValues = [{ value: 'a', displayName: 'A' }];

      const editorOptions = getEditorOptionsForParameter(schema, undefined, enumValues);

      expect(editorOptions.multiSelect).toBe(true);
      expect(editorOptions.options).toEqual([{ value: 'a', displayName: 'A', key: 'A' }]);
    });
  });
});
