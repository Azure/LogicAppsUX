import {
  customerOrdersJsonMock,
  missingSrcSchemaJsonMock,
  missingDstSchemaJsonMock,
  cbrInputRecordJsonMock,
  missingSrcSchemaNameMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  cbrInputRecordMapDefinitionMock,
} from '../__mocks__';
import { customerOrdersMapDefinitionMock } from '../__mocks__/mapDefinition/customerOrders';
import { jsonToMapDefinition } from '../jsonToMapDefinitionParser';

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
      expect(jsonToMapDefinition(cbrInputRecordJsonMock)).toEqual(cbrInputRecordMapDefinitionMock);
    });
  });
});
