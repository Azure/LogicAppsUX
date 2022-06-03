import {
  customerOrdersJsonMock,
  missingSrcSchemaJsonMock,
  missingDstSchemaJsonMock,
  cbrInputRecordJsonMock,
  missingSrcSchemaNameMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  cbrInputRecordMapDefinitionMock,
  simpleJsonExample,
  ifWithChildrenAndValueJsonMock,
  forWithIndexAndValueJsonMock,
  forWithChildrenAndValueJsonMock,
  forWithChildrenValueMapDefinitionMock,
  forWithIndexAndValueMapDefinitionMock,
} from '../__mocks__';
import { customerOrdersMapDefinitionMock } from '../__mocks__/mapDefinition/customerOrders';
import { jsonToMapDefinition } from '../jsonToMapDefinitionParser';
import { mapDefinitionToJson } from '../mapDefinitionToJsonParser';

describe('jsonToMapDefinitionParser', () => {
  describe('convertJsonToMapDefinition', () => {
    it('Test CBR Input', () => {
      expect(jsonToMapDefinition(cbrInputRecordJsonMock)).toEqual(cbrInputRecordMapDefinitionMock);
    });

    it('Test customer orders (in design doc)', () => {
      expect(jsonToMapDefinition(customerOrdersJsonMock)).toEqual(customerOrdersMapDefinitionMock);
    });

    it('Test for with children and value at the same time', () => {
      expect(jsonToMapDefinition(forWithChildrenAndValueJsonMock)).toEqual(forWithChildrenValueMapDefinitionMock);
    });

    // it('Test for with children with index', () => {
    //   expect(jsonToMapDefinition(forWithIndexAndValueJsonMock)).toEqual(forWithIndexAndValueMapDefinitionMock);
    // });

    // it('Test if with children and value at the same time', () => {
    //   expect(jsonToMapDefinition(ifWithChildrenAndValueJsonMock)).toEqual(ifWithChildrenAndValueMapDefinitionMock);
    // });

    // it('Test simple json example', () => {
    //   expect(jsonToMapDefinition(simpleJsonExample)).toEqual(simpleMapDefExampleMapDefinitionMock);
    // });

    // it('Test src schema name missing input', () => {
    //   expect(jsonToMapDefinition(missingSrcSchemaJsonMock)).toEqual(missingSrcSchemaNameMapDefinitionMock);
    // });

    // it('Test dst schema name missing input', () => {
    //   expect(jsonToMapDefinition(missingDstSchemaJsonMock)).toEqual(missingDstSchemaNameMapDefinitionMock);
    // });
  });

  describe('convertJsonToMapDefinition', () => {
    it('Test CBR Input', () => {
      expect(mapDefinitionToJson(cbrInputRecordMapDefinitionMock)).toEqual(cbrInputRecordJsonMock);
    });

    it('Test customer orders (in design doc)', () => {
      expect(mapDefinitionToJson(customerOrdersMapDefinitionMock)).toEqual(customerOrdersJsonMock);
    });

    it('Test for with children and value at the same time', () => {
      expect(mapDefinitionToJson(forWithChildrenValueMapDefinitionMock)).toEqual(forWithChildrenAndValueJsonMock);
    });
  });
});
