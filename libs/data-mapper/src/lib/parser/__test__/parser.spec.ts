import {
  missingDstSchemaJsonMock,
  missingSrcSchemaJsonMock,
  missingSrcSchemaNameMapcodeMock,
  missingDstSchemaNameMapcodeMock,
  CBRInputRecordJsonMock,
  CBRInputRecordMapcodeMock,
} from '../__mocks__';
import { customerOrdersJsonMock } from '../__mocks__/json/customerOrders';
import { customerOrdersMapcodeMock } from '../__mocks__/mapcode/customerOrders';
import { jsonToMapcode, removeNodeKey } from '../jsonToMapcodeParser';

describe('jsonToMapcodeParser', () => {
  describe('convertJsonToMapCode', () => {
    it('Test customer orders (in design doc)', () => {
      expect(jsonToMapcode(customerOrdersJsonMock)).toEqual(customerOrdersMapcodeMock);
    });

    it('Test src schema name missing input', () => {
      expect(jsonToMapcode(missingSrcSchemaJsonMock)).toEqual(missingSrcSchemaNameMapcodeMock);
    });

    it('Test dst schema name missing input', () => {
      expect(jsonToMapcode(missingDstSchemaJsonMock)).toEqual(missingDstSchemaNameMapcodeMock);
    });

    it('Test CBR Input', () => {
      expect(jsonToMapcode(CBRInputRecordJsonMock)).toEqual(CBRInputRecordMapcodeMock);
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
