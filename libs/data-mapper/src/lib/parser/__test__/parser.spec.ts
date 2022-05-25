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
import { jsonToMapcode } from '../jsonToMapcodeParser';

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
});
