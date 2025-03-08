import { getIntl } from '@microsoft/logic-apps-shared';
import { describe, it, expect } from 'vitest';
import { validateParameterValueWithSwaggerType } from '../validation';
import Constants from '../../../common/constants';
describe('Validation Utilities', () => {
  const intl = getIntl();

  describe('validateParameterValueWithSwaggerType', () => {
    it('should return undefined for not-required, empty value', () => {
      expect(validateParameterValueWithSwaggerType('', undefined, false, intl)).toEqual(undefined);
    });

    it('should return error message for required, empty value', () => {
      expect(validateParameterValueWithSwaggerType('', undefined, true, intl)).toEqual('Must provide value for parameter.');
    });

    it('should return undefined for array value for array swagger type disregarding required field', () => {
      const arrayValue = `["This is an array"]`;
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, arrayValue, true, intl)).toEqual(undefined);
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, arrayValue, false, intl)).toEqual(undefined);
    });

    it('should return error message for non-array value for array swagger type disregarding required field', () => {
      const stringValue = 'This is a string';
      const objectValue = `{"key": "This is an object"}`;
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, stringValue, true, intl)).toEqual('Enter a valid array.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, stringValue, false, intl)).toEqual('Enter a valid array.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, objectValue, true, intl)).toEqual('Enter a valid array.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.ARRAY, objectValue, false, intl)).toEqual('Enter a valid array.');
    });

    it('should return undefined for object value for object swagger type disregarding required field', () => {
      const objectValue = `{"key": "This is an object"}`;
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, objectValue, true, intl)).toEqual(undefined);
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, objectValue, false, intl)).toEqual(undefined);
    });

    it('should return error message for non-object value for object swagger type disregarding required field', () => {
      const stringValue = 'This is a string';
      const arrayValue = `["This is an array"]`;
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, stringValue, true, intl)).toEqual('Enter a valid JSON.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, stringValue, false, intl)).toEqual('Enter a valid JSON.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, arrayValue, true, intl)).toEqual('Enter a valid JSON.');
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.OBJECT, arrayValue, false, intl)).toEqual('Enter a valid JSON.');
    });

    it('should return undefined for boolean value for boolean swagger type disregarding required field', () => {
      const booleanValue = 'true';
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, booleanValue, true, intl)).toEqual(undefined);
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, booleanValue, false, intl)).toEqual(undefined);
    });

    it('should return error message for non-boolean value for boolean swagger type disregarding required field', () => {
      const stringValue = 'This is a string';
      const objectValue = `{"key": "This is an object"}`;
      const arrayValue = `["This is an array"]`;
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, stringValue, true, intl)).toEqual(
        'Enter a valid boolean.'
      );
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, stringValue, false, intl)).toEqual(
        'Enter a valid boolean.'
      );
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, objectValue, true, intl)).toEqual(
        'Enter a valid boolean.'
      );
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, objectValue, false, intl)).toEqual(
        'Enter a valid boolean.'
      );
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, arrayValue, true, intl)).toEqual(
        'Enter a valid boolean.'
      );
      expect(validateParameterValueWithSwaggerType(Constants.SWAGGER.TYPE.BOOLEAN, arrayValue, false, intl)).toEqual(
        'Enter a valid boolean.'
      );
    });
  });
});
