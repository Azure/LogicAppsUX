import {
  missingDstSchemaJsonMock,
  missingSrcSchemaJsonMock,
  missingSrcSchemaNameMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  CBRInputRecordJsonMock,
  CBRInputRecordMapDefinitionMock,
} from '../__mocks__';
import { customerOrdersJsonMock } from '../__mocks__/json/customerOrders';
import { customerOrdersMapDefinitionMock } from '../__mocks__/mapDefinition/customerOrders';
import { jsonToMapDefinition, removeNodeKey } from '../jsonToMapDefinitionParser';

describe('jsonToMapDefinitionParser', () => {
  describe('convertJsonToMapDefinition', () => {
    it('Test customer orders (in design doc)', () => {
      expect(jsonToMapDefinition(customerOrdersJsonMock)).toEqual(customerOrdersMapDefinitionMock);
    });

    it('Test src schema name missing input', () => {
      expect(jsonToMapDefinition(missingSrcSchemaJsonMock)).toEqual(missingSrcSchemaNameMapDefinitionMock);
    });

    it('Test dst schema name missing input', () => {
      expect(jsonToMapDefinition(missingDstSchemaJsonMock)).toEqual(missingDstSchemaNameMapDefinitionMock);
    });

    it('Test CBR Input', () => {
      expect(jsonToMapDefinition(CBRInputRecordJsonMock)).toEqual(CBRInputRecordMapDefinitionMock);
    });
  });

  describe('removeNodeKey', () => {
    it('Test where nodeKey and loopSource are equivalent', () => {
      expect(removeNodeKey('/abcd/cd/', 'bcd', 'bcd')).toEqual('/acd/');
    });

    it('Test where nodeKey and loopSource are empty', () => {
      expect(removeNodeKey('/abcd/cd/', '', '')).toEqual('abcdcd');
    });

    it('Test where only the nodeKey is empty', () => {
      expect(removeNodeKey('/abcd/cd/', '', 'bcd')).toEqual('acd');
    });

    it('Test where only the loopSource is empty', () => {
      expect(removeNodeKey('/abcd/cd/', 'bcd', '')).toEqual('/acd/');
    });

    it('Test where the input contains multiple nodeKey', () => {
      expect(removeNodeKey('/abcd/bcd/cd/', 'bcd', '')).toEqual('/acd/');
    });

    it('Test where the input contains multiple nodeKey without / gaps', () => {
      expect(removeNodeKey('/abcd/bcdbcd/cd/', 'bcd', 'fg')).toEqual('/abcdcd/');
    });

    it('Test where the input contains multiple loopSource', () => {
      expect(removeNodeKey('/abcd/bcd', 'fg', 'bcd')).toEqual('/a/');
    });

    it('Test where the input contains multiple loopSource without / gaps', () => {
      expect(removeNodeKey('/abcd/bcdbcd/cd/', 'fg', 'bcd')).toEqual('/a//cd/');
    });
  });
});
