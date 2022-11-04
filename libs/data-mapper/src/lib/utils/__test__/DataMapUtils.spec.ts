import { sourceMockSchema, targetMockSchema } from '../../__mocks__';
import { concatFunction } from '../../__mocks__/FunctionMock';
import type { MapDefinitionEntry } from '../../models';
import { convertFromMapDefinition } from '../DataMap.Utils';
import { convertSchemaToSchemaExtended } from '../Schema.Utils';

// TODO
describe('utils/DataMap', () => {
  const simpleMap: MapDefinitionEntry = {
    $version: '1',
    $input: 'XML',
    $output: 'XML',
    $sourceSchema: 'demo-source.xsd',
    $targetSchema: 'demo-source.xsd',
    $sourceNamespaces: {
      ns0: 'http://tempuri.org/source.xsd',
      xs: 'http://www.w3.org/2001/XMLSchema',
    },
    $targetNamespaces: {},
    'ns0:Root': {
      DirectTranslation: {
        Employee: {
          Name: '/ns0:Root/DirectTranslation/EmployeeName',
        },
      },
    },
  };

  it('creates simple connections based on map', () => {
    const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
    const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);
    const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, [concatFunction]);
    console.log(result);
    expect(result).toBeTruthy();
  });
});
