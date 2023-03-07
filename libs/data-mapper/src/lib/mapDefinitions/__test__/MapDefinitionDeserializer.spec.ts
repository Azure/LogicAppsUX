import type { MapDefinitionEntry } from '../../models';
import { directAccessPseudoFunctionKey, functionMock, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../../models';
import type { ConnectionUnit } from '../../models/Connection';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { convertFromMapDefinition } from '../MapDefinitionDeserializer';
import { comprehensiveSourceSchema, comprehensiveTargetSchema, sourceMockSchema, targetMockSchema } from '__mocks__/schemas';

describe('mapDefinitions/MapDefinitionDeserializer', () => {
  describe('XML', () => {
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
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
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
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
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
        expect((resultEntries[0][1].inputs[0][1] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
        expect(resultEntries[0][1].inputs[0][2]).toEqual('", Esq"');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(concatId);
      });

      it('creates connections for nested functions within a loop', () => {
        simpleMap['ns0:Root'] = {
          CumulativeExpression: {
            PopulationSummary: {
              '$for(/ns0:Root/CumulativeExpression/Population/State)': {
                State: {
                  Name: 'Name',
                  SexRatio: 'divide(count(County/Person/Sex/Male), count(County/Person/Sex/Female))',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(
          (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:Root/CumulativeExpression/Population/State');
        expect(
          (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:Root/CumulativeExpression/Population/State/Name');

        const divideRfKey = (
          result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio'].inputs[0][0] as ConnectionUnit
        ).reactFlowKey;
        expect(divideRfKey).toContain('Divide');

        const count1RfKey = (result[divideRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(count1RfKey).toContain('Count');
        expect((result[count1RfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Male'
        );

        const count2RfKey = (result[divideRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey;
        expect(count2RfKey).toContain('Count');
        expect((result[count2RfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Female'
        );
      });

      it('creates a simple conditional property connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemQuantity, 200))': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalMapping/ItemQuantity'
        );
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');

        expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[1][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toContain('IsGreater');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a conditional property connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))': {
              ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs[0].length).toBeGreaterThan(1);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs[0].length).toBeGreaterThan(1);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[3][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[4][1].outputs[1].reactFlowKey).toContain('Multiply');
        expect(resultEntries[4][1].outputs[2].reactFlowKey).toContain('Multiply');

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[5][1].outputs[1].reactFlowKey).toContain('Multiply');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a simple conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemQuantity, 200))': {
            ConditionalMapping: {
              ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(7);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalMapping/ItemQuantity'
        );
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[1][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toContain('IsGreater');

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/ConditionalMapping');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))': {
            ConditionalMapping: {
              ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
              ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(10);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs[0].length).toBeGreaterThan(1);
        expect(resultEntries[1][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs[0].length).toBeGreaterThan(1);
        expect(resultEntries[2][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[5][1].outputs[1].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1].outputs[2].reactFlowKey).toContain('Multiply');

        expect(resultEntries[6][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[6][1]).toBeTruthy();
        expect(resultEntries[6][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[6][1].outputs[1].reactFlowKey).toContain('Multiply');

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');

        expect(resultEntries[9][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[9][1]).toBeTruthy();
        expect((resultEntries[9][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
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

      // TODO: 16770037 - Once the BE fixes how loops are parsed in getSchemaTree we should restore this to match
      // the transcript yml file
      it('creates a looping conditional connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalLooping: {
            '$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)': {
              CategorizedCatalog: {
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

        expect(resultEntries.length).toEqual(9);

        expect(resultEntries[0][0]).toContain('IsEqual');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('SubString');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('"1"');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain('SubString');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU'
        );
        expect(resultEntries[1][1].inputs[1][0]).toEqual('1');
        expect(resultEntries[1][1].inputs[2][0]).toEqual('2');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toContain('IsEqual');

        expect(resultEntries[2][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsEqual');
        expect((resultEntries[2][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product'
        );
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct');

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual(
          'target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name'
        );

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('SubString');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product'
        );

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name'
        );
      });

      it('creates a custom value direct access connection', () => {
        simpleMap['ns0:Root'] = {
          LoopingWithIndex: {
            WeatherSummary: {
              Day1: {
                Name: '"Day 1"',
                Pressure: '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure',
              },
              Day2: {
                Name: '"Day 2"',
                Temperature: '/ns0:Root/LoopingWithIndex/WeatherReport[2]/@Temperature',
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(Object.entries(result).length).toEqual(9);
        expect(result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name'].inputs[0][0] as string).toBe('"Day 1"');
        expect(result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name'].inputs[0][0] as string).toBe('"Day 2"');

        const directAccess1Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        const directAccess2Key = (
          result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature'].inputs[0][0] as ConnectionUnit
        ).reactFlowKey;

        expect(directAccess1Key).toContain(directAccessPseudoFunctionKey);
        expect(directAccess2Key).toContain(directAccessPseudoFunctionKey);

        expect(result[directAccess1Key].inputs[0][0] as string).toBe('1');
        expect((result[directAccess1Key].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        expect((result[directAccess1Key].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );

        expect(result[directAccess2Key].inputs[0][0] as string).toBe('2');
        expect((result[directAccess2Key].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        expect((result[directAccess2Key].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Temperature'
        );
      });

      it('creates a looping connection w/ index variable and direct access', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            Trips: {
              '$for(/ns0:Root/Looping/VehicleTrips/Trips, $i)': {
                Trip: {
                  VehicleRegistration:
                    '/ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration',
                  Distance: '/ns0:Root/Looping/VehicleTrips/Vehicle[$i]/VehicleRegistration',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(Object.entries(result).length).toEqual(12);

        const indexRfKey = (result['target-/ns0:Root/Looping/Trips/Trip'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Trips');

        const directAccessRfKey1 = (result['target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(directAccessRfKey1).toContain(directAccessPseudoFunctionKey);
        const isEqualRfKey = (result[directAccessRfKey1].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(isEqualRfKey).toContain('IsEqual');
        expect((result[directAccessRfKey1].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle'
        );
        expect((result[directAccessRfKey1].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        const directAccessRfKey2 = (result['target-/ns0:Root/Looping/Trips/Trip/Distance'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(directAccessRfKey2).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey2].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey2].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle'
        );
        expect((result[directAccessRfKey2].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        expect((result[isEqualRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips/VehicleId'
        );
        const directAccessRfKey3 = (result[isEqualRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey;
        expect(directAccessRfKey3).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey3].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey3].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips'
        );
        expect((result[directAccessRfKey3].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips/VehicleId'
        );
      });

      it('creates a looping connection w/ index variable, conditional, and relative attribute path', () => {
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

        expect(Object.entries(result).length).toEqual(9);

        const indexFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexFnRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');

        const conditionalFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[0][1] as ConnectionUnit)
          .reactFlowKey;
        expect(conditionalFnRfKey).toContain(ifPseudoFunctionKey);
        expect((result[conditionalFnRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        const greaterFnRfKey = (result[conditionalFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(greaterFnRfKey).toContain('IsGreater');
        expect((result[greaterFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexFnRfKey);
        expect(result[greaterFnRfKey].inputs[1][0] as string).toBe('2');

        const concatFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Name'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(concatFnRfKey).toContain('Concat');
        expect(result[concatFnRfKey].inputs[0][0] as string).toBe('"Day "');
        expect((result[concatFnRfKey].inputs[0][1] as ConnectionUnit).reactFlowKey).toBe(indexFnRfKey);

        expect((result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Pressure'].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );
      });

      it('creates a many-to-many loop connection', () => {
        const extendedLoopSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedLoopTarget = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        delete simpleMap['ns0:Root'];
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            ManyToMany: {
              '$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)': {
                Simple: {
                  '$for(SourceSimpleChild)': {
                    SimpleChild: {
                      '$for(SourceSimpleChildChild)': {
                        SimpleChildChild: {
                          Direct: 'SourceDirect',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedLoopSource, extendedLoopTarget, []);
        expect(Object.entries(result).length).toEqual(8);

        expect((result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple'].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple'
        );
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild');
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild'].inputs[0][0] as ConnectionUnit)
            .reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild');

        expect(
          (
            result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct']
              .inputs[0][0] as ConnectionUnit
          ).reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect');
      });

      it('creates a many-to-one loop connection with nested index variables', () => {
        const extendedComprehensiveSourceSchema = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedComprehensiveTargetSchema = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        delete simpleMap['ns0:Root'];
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            ManyToOne: {
              '$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)': {
                '$for(SourceSimpleChild, $b)': {
                  '$for(SourceSimpleChildChild, $c)': {
                    Simple: {
                      Direct: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild[$b]/SourceDirect',
                    },
                  },
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );

        expect(Object.entries(result).length).toEqual(10);

        const indexRfKey1 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey1).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey1].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );

        const indexRfKey2 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][1] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey2).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey2].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'
        );

        const indexRfKey3 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][2] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey3).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey3].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'
        );

        const directAccessRfKey = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(directAccessRfKey).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey2);
        expect((result[directAccessRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect((result[directAccessRfKey].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
      });

      it('creates a loop connection with dot access', () => {
        const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
        const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);
        delete simpleMap['ns0:TargetSchemaRoot'];
        simpleMap['ns0:Root'] = {
          NameValueTransforms: {
            PO_Status: {
              '$for(/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem)': {
                Product: {
                  ProductIdentifier: '.',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, []);

        expect(Object.entries(result).length).toEqual(3);

        expect((result['target-/ns0:Root/NameValueTransforms/PO_Status/Product'].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem'
        );
        expect(
          (result['target-/ns0:Root/NameValueTransforms/PO_Status/Product/ProductIdentifier'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toBe('source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem');
      });
    });
  });

  describe('JSON', () => {
    const simpleMap: MapDefinitionEntry = {
      $version: '1',
      $input: 'JSON',
      $output: 'JSON',
      $sourceSchema: 'SourceSchemaJson.json',
      $targetSchema: 'TargetSchemaJson.json',
      root: {
        String1: '/root/OrderNo',
      },
    };
    const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
    const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

    describe('convertFromMapDefinition', () => {
      it.skip('creates a simple connection between one source and target node', () => {
        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
      });

      it.skip('creates a connection between one source and target node with leading @', () => {
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

      it.skip('creates a connection between one source and target nodes value', () => {
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

      it.skip('creates a connection between a custom value and target node', () => {
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

      it.skip('creates a simple connection between one source, one function and one target', () => {
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
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(concatId);
      });

      it.skip('creates a connection between a content enricher function and target', () => {
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

      it.skip('creates a connection between a source, a function with custom value and a target', () => {
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
        expect((resultEntries[0][1].inputs[0][1] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/DirectTranslation/EmployeeName'
        );
        expect(resultEntries[0][1].inputs[0][2]).toEqual('", Esq"');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(concatId);
      });

      it.skip('creates connections for nested functions within a loop', () => {
        simpleMap['ns0:Root'] = {
          CumulativeExpression: {
            PopulationSummary: {
              '$for(/ns0:Root/CumulativeExpression/Population/State)': {
                State: {
                  Name: 'Name',
                  SexRatio: 'divide(count(County/Person/Sex/Male), count(County/Person/Sex/Female))',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(
          (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:Root/CumulativeExpression/Population/State');
        expect(
          (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:Root/CumulativeExpression/Population/State/Name');

        const divideRfKey = (
          result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio'].inputs[0][0] as ConnectionUnit
        ).reactFlowKey;
        expect(divideRfKey).toContain('Divide');

        const count1RfKey = (result[divideRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(count1RfKey).toContain('Count');
        expect((result[count1RfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Male'
        );

        const count2RfKey = (result[divideRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey;
        expect(count2RfKey).toContain('Count');
        expect((result[count2RfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Female'
        );
      });

      it.skip('creates a simple conditional property connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemQuantity, 200))': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalMapping/ItemQuantity'
        );
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');

        expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[1][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toContain('IsGreater');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('creates a conditional property connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))': {
              ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs[0].length).toBeGreaterThan(1);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs[0].length).toBeGreaterThan(1);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[3][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[4][1].outputs[1].reactFlowKey).toContain('Multiply');
        expect(resultEntries[4][1].outputs[2].reactFlowKey).toContain('Multiply');

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[5][1].outputs[1].reactFlowKey).toContain('Multiply');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('creates a simple conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemQuantity, 200))': {
            ConditionalMapping: {
              ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(7);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalMapping/ItemQuantity'
        );
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[1][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toContain('IsGreater');

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/ConditionalMapping');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('creates a conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))': {
            ConditionalMapping: {
              ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
              ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(10);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('200');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs[0].length).toBeGreaterThan(1);
        expect(resultEntries[1][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs[0].length).toBeGreaterThan(1);
        expect(resultEntries[2][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalMapping');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[5][1].outputs[1].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[5][1].outputs[2].reactFlowKey).toContain('Multiply');

        expect(resultEntries[6][0]).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect(resultEntries[6][1]).toBeTruthy();
        expect(resultEntries[6][1].outputs[0].reactFlowKey).toContain('Multiply');
        expect(resultEntries[6][1].outputs[1].reactFlowKey).toContain('Multiply');

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('Multiply');

        expect(resultEntries[9][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[9][1]).toBeTruthy();
        expect((resultEntries[9][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('creates a loop connection', () => {
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

      // TODO: 16770037 - Once the BE fixes how loops are parsed in getSchemaTree we should restore this to match
      // the transcript yml file
      it.skip('creates a looping conditional connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalLooping: {
            '$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)': {
              CategorizedCatalog: {
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

        expect(resultEntries.length).toEqual(9);

        expect(resultEntries[0][0]).toContain('IsEqual');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('SubString');
        expect(resultEntries[0][1].inputs[1][0]).toEqual('"1"');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain('SubString');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU'
        );
        expect(resultEntries[1][1].inputs[1][0]).toEqual('1');
        expect(resultEntries[1][1].inputs[2][0]).toEqual('2');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toContain('IsEqual');

        expect(resultEntries[2][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain('IsEqual');
        expect((resultEntries[2][1].inputs[1][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product'
        );
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct');

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog');

        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual(
          'target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name'
        );

        expect(resultEntries[5][0]).toEqual('source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toContain('SubString');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product'
        );

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/Name'
        );
      });

      it.skip('creates a custom value direct access connection', () => {
        simpleMap['ns0:Root'] = {
          LoopingWithIndex: {
            WeatherSummary: {
              Day1: {
                Name: '"Day 1"',
                Pressure: '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure',
              },
              Day2: {
                Name: '"Day 2"',
                Temperature: '/ns0:Root/LoopingWithIndex/WeatherReport[2]/@Temperature',
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(Object.entries(result).length).toEqual(9);
        expect(result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name'].inputs[0][0] as string).toBe('"Day 1"');
        expect(result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name'].inputs[0][0] as string).toBe('"Day 2"');

        const directAccess1Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        const directAccess2Key = (
          result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature'].inputs[0][0] as ConnectionUnit
        ).reactFlowKey;

        expect(directAccess1Key).toContain(directAccessPseudoFunctionKey);
        expect(directAccess2Key).toContain(directAccessPseudoFunctionKey);

        expect(result[directAccess1Key].inputs[0][0] as string).toBe('1');
        expect((result[directAccess1Key].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        expect((result[directAccess1Key].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );

        expect(result[directAccess2Key].inputs[0][0] as string).toBe('2');
        expect((result[directAccess2Key].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        expect((result[directAccess2Key].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Temperature'
        );
      });

      it.skip('creates a looping connection w/ index variable and direct access', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            Trips: {
              '$for(/ns0:Root/Looping/VehicleTrips/Trips, $i)': {
                Trip: {
                  VehicleRegistration:
                    '/ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration',
                  Distance: '/ns0:Root/Looping/VehicleTrips/Vehicle[$i]/VehicleRegistration',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);

        expect(Object.entries(result).length).toEqual(12);

        const indexRfKey = (result['target-/ns0:Root/Looping/Trips/Trip'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Trips');

        const directAccessRfKey1 = (result['target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(directAccessRfKey1).toContain(directAccessPseudoFunctionKey);
        const isEqualRfKey = (result[directAccessRfKey1].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(isEqualRfKey).toContain('IsEqual');
        expect((result[directAccessRfKey1].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle'
        );
        expect((result[directAccessRfKey1].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        const directAccessRfKey2 = (result['target-/ns0:Root/Looping/Trips/Trip/Distance'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(directAccessRfKey2).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey2].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey2].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle'
        );
        expect((result[directAccessRfKey2].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        expect((result[isEqualRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips/VehicleId'
        );
        const directAccessRfKey3 = (result[isEqualRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey;
        expect(directAccessRfKey3).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey3].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey3].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips'
        );
        expect((result[directAccessRfKey3].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips/VehicleId'
        );
      });

      it.skip('creates a looping connection w/ index variable, conditional, and relative attribute path', () => {
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

        expect(Object.entries(result).length).toEqual(9);

        const indexFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexFnRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');

        const conditionalFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[0][1] as ConnectionUnit)
          .reactFlowKey;
        expect(conditionalFnRfKey).toContain(ifPseudoFunctionKey);
        expect((result[conditionalFnRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        const greaterFnRfKey = (result[conditionalFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(greaterFnRfKey).toContain('IsGreater');
        expect((result[greaterFnRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexFnRfKey);
        expect(result[greaterFnRfKey].inputs[1][0] as string).toBe('2');

        const concatFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Name'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(concatFnRfKey).toContain('Concat');
        expect(result[concatFnRfKey].inputs[0][0] as string).toBe('"Day "');
        expect((result[concatFnRfKey].inputs[0][1] as ConnectionUnit).reactFlowKey).toBe(indexFnRfKey);

        expect((result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Pressure'].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );
      });

      it.skip('creates a many-to-many loop connection', () => {
        const extendedLoopSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedLoopTarget = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        delete simpleMap['ns0:Root'];
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            ManyToMany: {
              '$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)': {
                Simple: {
                  '$for(SourceSimpleChild)': {
                    SimpleChild: {
                      '$for(SourceSimpleChildChild)': {
                        SimpleChildChild: {
                          Direct: 'SourceDirect',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedLoopSource, extendedLoopTarget, []);
        expect(Object.entries(result).length).toEqual(8);

        expect((result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple'].inputs[0][0] as ConnectionUnit).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple'
        );
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild');
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild'].inputs[0][0] as ConnectionUnit)
            .reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild');

        expect(
          (
            result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct']
              .inputs[0][0] as ConnectionUnit
          ).reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect');
      });

      it.skip('creates a many-to-one loop connection with nested index variables', () => {
        const extendedComprehensiveSourceSchema = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedComprehensiveTargetSchema = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        delete simpleMap['ns0:Root'];
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            ManyToOne: {
              '$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)': {
                '$for(SourceSimpleChild, $b)': {
                  '$for(SourceSimpleChildChild, $c)': {
                    Simple: {
                      Direct: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild[$b]/SourceDirect',
                    },
                  },
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );

        expect(Object.entries(result).length).toEqual(10);

        const indexRfKey1 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][0] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey1).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey1].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );

        const indexRfKey2 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][1] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey2).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey2].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'
        );

        const indexRfKey3 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0][2] as ConnectionUnit).reactFlowKey;
        expect(indexRfKey3).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey3].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'
        );

        const directAccessRfKey = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct'].inputs[0][0] as ConnectionUnit)
          .reactFlowKey;
        expect(directAccessRfKey).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(indexRfKey2);
        expect((result[directAccessRfKey].inputs[1][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect((result[directAccessRfKey].inputs[2][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
      });

      it.skip('creates a loop connection with dot access', () => {
        const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
        const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);
        delete simpleMap['ns0:TargetSchemaRoot'];
        simpleMap['ns0:Root'] = {
          NameValueTransforms: {
            PO_Status: {
              '$for(/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem)': {
                Product: {
                  ProductIdentifier: '.',
                },
              },
            },
          },
        };

        const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, []);

        expect(Object.entries(result).length).toEqual(3);

        expect((result['target-/ns0:Root/NameValueTransforms/PO_Status/Product'].inputs[0][0] as ConnectionUnit).reactFlowKey).toBe(
          'source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem'
        );
        expect(
          (result['target-/ns0:Root/NameValueTransforms/PO_Status/Product/ProductIdentifier'].inputs[0][0] as ConnectionUnit).reactFlowKey
        ).toBe('source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem');
      });
    });
  });
});
