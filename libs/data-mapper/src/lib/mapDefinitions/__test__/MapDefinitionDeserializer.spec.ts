import { simpleLoopSource, simpleLoopTarget, sourceMockSchema, targetMockSchema } from '../../__mocks__';
import type { MapDefinitionEntry } from '../../models';
import { functionMock, ifPseudoFunctionKey } from '../../models';
import type { ConnectionUnit } from '../../models/Connection';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { convertFromMapDefinition } from '../MapDefinitionDeserializer';

describe('mapDefinitions/MapDefinitionDeserializer', () => {
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
  const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
  const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

  describe('convertFromMapDefinition', () => {
    it('creates a simple connection between one source and target node', () => {
      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(2);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

      expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[1][1]).toBeTruthy();
      expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
    });

    it('creates a connection between one source and target node with leading @', () => {
      simpleMap['ns0:Root'] = {
        DataTranslation: {
          EmployeeName: {
            '$@RegularFulltime': '/ns0:Root/DataTranslation/Employee/EmploymentStatus',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(2);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DataTranslation/Employee/EmploymentStatus');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime');

      expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime');
      expect(resultEntries[1][1]).toBeTruthy();
      expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
        'source-/ns0:Root/DataTranslation/Employee/EmploymentStatus'
      );
    });

    it('creates a connection between one source and target nodes value', () => {
      simpleMap['ns0:Root'] = {
        DataTranslation: {
          EmployeeName: {
            $value: '/ns0:Root/DataTranslation/Employee/FirstName',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(2);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DataTranslation/Employee/FirstName');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DataTranslation/EmployeeName');

      expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DataTranslation/EmployeeName');
      expect(resultEntries[1][1]).toBeTruthy();
      expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
        'source-/ns0:Root/DataTranslation/Employee/FirstName'
      );
    });

    it('creates a connection between a custom value and target node', () => {
      simpleMap['ns0:Root'] = {
        DirectTranslation: {
          Employee: {
            Name: '"Steve"',
            ID: '10',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(2);

      expect(resultEntries[0][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/ID');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].inputs[0][0]).toEqual('10');

      expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[1][1]).toBeTruthy();
      expect(resultEntries[1][1].inputs[0][0]).toEqual('"Steve"');
    });

    it('creates a simple connection between one source, one function and one target', () => {
      simpleMap['ns0:Root'] = {
        DirectTranslation: {
          Employee: {
            Name: 'concat(/ns0:Root/DirectTranslation/EmployeeName)',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(3);

      const concatId = resultEntries[0][0];

      expect(resultEntries[0][0]).toEqual(concatId);
      expect(resultEntries[0][1]).toBeTruthy();
      expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      expect(resultEntries[1][1]).toBeTruthy();
      expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

      expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[2][1]).toBeTruthy();
      expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(concatId);
    });

    it('creates a connection between a content enricher function and target', () => {
      simpleMap['ns0:Root'] = {
        ContentEnrich: {
          DateOfDemo: 'current-date()',
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(2);

      const currentDateId = resultEntries[0][0];

      expect(resultEntries[0][0]).toEqual(currentDateId);
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ContentEnrich/DateOfDemo');

      expect(resultEntries[1][0]).toEqual('target-/ns0:Root/ContentEnrich/DateOfDemo');
      expect(resultEntries[1][1]).toBeTruthy();
      expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(currentDateId);
    });

    it('creates a connection between a source, a function with custom value and a target', () => {
      simpleMap['ns0:Root'] = {
        DirectTranslation: {
          Employee: {
            Name: 'concat("Employee Name: ", /ns0:Root/DirectTranslation/EmployeeName, ", Esq")',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(3);

      const concatId = resultEntries[0][0];

      expect(resultEntries[0][0]).toEqual(concatId);
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].inputs[0][0]).toEqual('"Employee Name: "');
      expect((resultEntries[0][1].inputs[0][1] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      expect(resultEntries[0][1].inputs[0][2]).toEqual('", Esq"');
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      expect(resultEntries[1][1]).toBeTruthy();
      expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

      expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[2][1]).toBeTruthy();
      expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(concatId);
    });

    it.skip('creates a conditional connection', () => {
      simpleMap['ns0:Root'] = {
        ConditionalMapping: {
          '$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))': {
            ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      // All these expects might be incorrect
      expect(resultEntries.length).toEqual(6);

      expect(resultEntries[0][0]).toContain('IsGreater');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
      expect(resultEntries[3][1]).toBeTruthy();

      expect(resultEntries[4][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[4][1]).toBeTruthy();
    });

    it('creates a loop connection', () => {
      simpleMap['ns0:Root'] = {
        Looping: {
          '$for(/ns0:Root/Looping/Employee)': {
            Person: {
              Name: 'TelephoneNumber',
            },
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, []);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(4);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/Looping/Employee');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('target-/ns0:Root/Looping/Person');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
      expect(resultEntries[3][1]).toBeTruthy();
    });

    it.skip('creates a looping conditional connection', () => {
      simpleMap['ns0:Root'] = {
        ConditionalLooping: {
          CategorizedCatalog: {
            '$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)': {
              '$if(is-equal(substring(SKU, 1, 2), "1"))': {
                PetProduct: {
                  Name: 'Name',
                },
              },
            },
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      // All these expects might be incorrect
      expect(resultEntries.length).toEqual(5);

      expect(resultEntries[0][0]).toContain('IsGreater');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
      expect(resultEntries[3][1]).toBeTruthy();

      expect(resultEntries[4][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[4][1]).toBeTruthy();
    });

    it.skip('creates a direct index connection', () => {
      simpleMap['ns0:Root'] = {
        LoopingWithIndex: {
          WeatherSummary: {
            Day1: {
              Name: '"Day 1"',
              Pressure: '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure',
            },
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      // All these expects might be incorrect
      expect(resultEntries.length).toEqual(5);

      expect(resultEntries[0][0]).toContain('IsGreater');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
      expect(resultEntries[3][1]).toBeTruthy();

      expect(resultEntries[4][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[4][1]).toBeTruthy();
    });

    it.skip('creates a direct index looping connection', () => {
      simpleMap['ns0:Root'] = {
        LoopingWithIndex: {
          WeatherSummary: {
            '$for(/ns0:Root/LoopingWithIndex/WeatherReport, $a)': {
              '$if(is-greater-than($a, 2))': {
                Day: {
                  Name: 'concat("Day ", $a)',
                  Pressure: './@Pressure',
                },
              },
            },
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      // All these expects might be incorrect
      expect(resultEntries.length).toEqual(5);

      expect(resultEntries[0][0]).toContain('IsGreater');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
      expect(resultEntries[3][1]).toBeTruthy();

      expect(resultEntries[4][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
      expect(resultEntries[4][1]).toBeTruthy();
    });

    it('creates a nested loop connection', () => {
      const extendedLoopSource = convertSchemaToSchemaExtended(simpleLoopSource);
      const extendedLoopTarget = convertSchemaToSchemaExtended(simpleLoopTarget);
      simpleMap['ns0:Root'] = {
        Ano: {
          '$for(/ns0:Root/Year)': {
            Mes: {
              '$for(/ns0:Root/Year/Month)': {
                Dia: 'Day',
              },
            },
          },
        },
      };

      const result = convertFromMapDefinition(simpleMap, extendedLoopSource, extendedLoopTarget, []);
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(4);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/Year/Month');
      expect(resultEntries[0][1]).toBeTruthy();

      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Year/Month/Day');
      expect(resultEntries[1][1]).toBeTruthy();

      expect(resultEntries[2][0]).toEqual('target-/ns0:Root/Ano/Mes');
      expect(resultEntries[2][1]).toBeTruthy();

      expect(resultEntries[3][0]).toEqual('target-/ns0:Root/Ano/Mes/Dia');
      expect(resultEntries[3][1]).toBeTruthy();
    });
  });
});
