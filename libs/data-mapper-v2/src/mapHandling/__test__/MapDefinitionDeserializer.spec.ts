import { directAccessPseudoFunctionKey, functionMock, ifPseudoFunctionKey, indexPseudoFunctionKey } from '../../models';
import type { Connection, ConnectionDictionary, CustomValueConnection, NodeConnection } from '../../models/Connection';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { MapDefinitionDeserializer, getLoopTargetNodeWithJson } from '../MapDefinitionDeserializer';
import {
  InitLoggerService,
  map,
  type DataMapSchema,
  type MapDefinitionEntry,
  type SchemaExtended,
  type SchemaNodeExtended,
} from '@microsoft/logic-apps-shared';
import {
  adjacentLoopsSchema,
  comprehensiveSourceSchema,
  comprehensiveTargetSchema,
  customerSchema,
  deepNestedSequenceAndObject,
  sourceMockJsonSchema,
  sourceMockSchema,
  targetMockJsonSchema,
  targetMockSchema,
} from '../../__mocks__/schemas';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { isCustomValueConnection } from '../../utils/Connection.Utils';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import { isEqualToCustomValue } from './MapHandlingTestUtilis';

// Mock LoggerService
const createMockLoggerService = (): ILoggerService => {
  return {
    log: vi.fn(),
    startTrace: vi.fn().mockReturnValue('mock-trace-id'),
    endTrace: vi.fn(),
    logErrorWithFormatting: vi.fn(),
  };
};

describe('mapDefinitions/MapDefinitionDeserializer', () => {
  InitLoggerService([createMockLoggerService()]);
  describe('XML', () => {
    let simpleMap: MapDefinitionEntry = {};
    const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema as any as DataMapSchema);
    const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema as any as DataMapSchema);

    beforeEach(() => {
      simpleMap = {
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
      };
    });

    describe('convertFromMapDefinition', () => {
      it('processes schemas with a specific namespace', () => {
        const customerTarget = convertSchemaToSchemaExtended(customerSchema as any as DataMapSchema);
        const customerSource = customerTarget;
        simpleMap['/tns:PROJECT_REQUEST_ROOT'] = {
          'tns:PROJECT_REQUEST': {
            'tns:INTEGRATION_HEADER': {
              'tns:SenderSystem': '/tns:PROJECT_REQUEST_ROOT/tns:PROJECT_REQUEST/tns:INTEGRATION_HEADER/tns:SenderSystem',
            },
          },
        };
        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, customerSource, customerTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();
      });

      it('processes schemas with a specific namespace with a loop', () => {
        const customerTarget = convertSchemaToSchemaExtended(customerSchema as any as DataMapSchema);
        const customerSource = customerTarget;
        simpleMap['/tns:PROJECT_REQUEST_ROOT'] = {
          'tns:PROJECT_REQUEST': {
            'tns:PROJINTRF': {
              '$for(/tns:PROJECT_REQUEST_ROOT/tns:PROJECT_REQUEST/tns:PROJINTRF/tns:PROJECT)': {
                'tns:PROJECT': {
                  'tns:PM_PROJECT_REFERENCE': 'tns:PM_PROJECT_REFERENCE',
                },
              },
            },
          },
        };
        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, customerSource, customerTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();
        expect(resultEntries.length).toEqual(4);
      });

      it('processes schemas with a specific namespace with a loop', () => {
        const customerTarget = convertSchemaToSchemaExtended(customerSchema as any as DataMapSchema);
        const customerSource = customerTarget;
        simpleMap['/tns:PROJECT_REQUEST_ROOT'] = {
          'tns:PROJECT_REQUEST': {
            'tns:PROJINTRF': {
              '$for(/tns:PROJECT_REQUEST_ROOT/tns:PROJECT_REQUEST/tns:PROJINTRF/tns:PROJECT)': {
                'tns:PROJECT': {
                  'tns:PM_PROJECT_REFERENCE': 'tns:PM_PROJECT_REFERENCE',
                },
              },
            },
          },
        };
        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, customerSource, customerTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();
        expect(resultEntries.length).toEqual(4);
      });

      it('creates a simple connection between one source and target node', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
      });

      it('creates a connection between one source and target node with leading @', () => {
        simpleMap['ns0:Root'] = {
          DataTranslation: {
            EmployeeName: {
              '$@RegularFulltime': '/ns0:Root/DataTranslation/Employee/EmploymentStatus',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DataTranslation/Employee/EmploymentStatus');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DataTranslation/EmployeeName/@RegularFulltime');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();
        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DataTranslation/Employee/FirstName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DataTranslation/EmployeeName');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DataTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/ID');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as CustomValueConnection).value).toEqual('10');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as CustomValueConnection).value).toEqual('"Steve"');
      });

      it('creates a simple connection between one source, one function and one target', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: 'concat(/ns0:Root/DirectTranslation/EmployeeName)',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);
      });

      it('creates a connection between one source, one function and two targets', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: 'concat(/ns0:Root/DirectTranslation/EmployeeName)',
              ID: 'concat(/ns0:Root/DirectTranslation/EmployeeName)',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/ID');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);

        expect(resultEntries[3][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);
      });

      it('creates a connection between a content enricher function and target', () => {
        simpleMap['ns0:Root'] = {
          ContentEnrich: {
            DateOfDemo: 'current-date()',
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        const currentDateId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(currentDateId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ContentEnrich/DateOfDemo');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/ContentEnrich/DateOfDemo');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(currentDateId);
      });

      it('creates a connection between a source, a function with custom value and a target', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: 'concat("Employee Name: ", /ns0:Root/DirectTranslation/EmployeeName, ", Esq")',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as CustomValueConnection).value).toEqual('"Employee Name: "');
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect((resultEntries[0][1].inputs[2] as CustomValueConnection).value).toEqual('", Esq"');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);
      });

      it('creates connections for nested functions no loop', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: 'concat(count(/ns0:Root/DirectTranslation/EmployeeName), max(/ns0:Root/DirectTranslation/EmployeeID))',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey.includes('Count')).toBeTruthy();
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey.includes('Max')).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0].includes('Count')).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');

        expect(resultEntries[2][0].includes('Max')).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeID');
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
        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect((result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State'].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State'
        );
        expect(
          (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/Name'].inputs[0] as NodeConnection).reactFlowKey
        ).toEqual('source-/ns0:Root/CumulativeExpression/Population/State/Name');

        const divideRfKey = (result['target-/ns0:Root/CumulativeExpression/PopulationSummary/State/SexRatio'].inputs[0] as NodeConnection)
          .reactFlowKey;
        expect(divideRfKey).toContain('Divide');

        const count1RfKey = (result[divideRfKey].inputs[0] as NodeConnection).reactFlowKey;
        expect(count1RfKey).toContain('Count');
        expect((result[count1RfKey].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Male'
        );

        const count2RfKey = (result[divideRfKey].inputs[1] as NodeConnection).reactFlowKey;
        expect(count2RfKey).toContain('Count-');
        const count2Input = (result[count2RfKey].inputs[0] as NodeConnection).reactFlowKey;
        expect(count2Input).toEqual('source-/ns0:Root/CumulativeExpression/Population/State/County/Person/Sex/Female');
      });

      it('creates conditional property connection with a function and custom value', () => {
        // tests issue where custom values were being loaded with extra '/'; only stripped this in vs-code-designer for target side!
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-string(\\"USA\\"))': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect((resultEntries[0][1].inputs[0] as CustomValueConnection).value).toEqual('"USA"'); // ensures extra connections aren't made
      });

      it('creates a simple conditional property connection with a function', () => {
        // tests issue with input connections to function being re-created
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-string(/ns0:Root/ConditionalMapping/ItemQuantity))': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
            '6746506B-6072-41DE-8B64-81CE6E7AF9DE-$if(is-string(/ns0:Root/ConditionalMapping/ItemQuantity))': {
              ItemQuantity: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][1].inputs.length).toEqual(1); // ensures extra connections aren't made
      });

      it('creates a simple conditional property connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '$if(/ns0:Root/ConditionalMapping/ItemQuantity)': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        expect(resultEntries[0][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates two conditionals under the same object', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '$if(/ns0:Root/ConditionalMapping/ItemQuantity)': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        expect(resultEntries[0][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a conditional property connection with function', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))':
              {
                ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
              },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('Multiply');
        expect((resultEntries[0][1].inputs[1] as CustomValueConnection).value).toEqual('200');

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs.length).toBeGreaterThan(1);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs.length).toBeGreaterThan(1);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toContain('Multiply');

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
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a conditional property connection with function', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))':
              {
                ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
              },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('Multiply');
        isEqualToCustomValue('200', resultEntries[0][1].inputs[1]);

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs.length).toBeTruthy();

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs[0]).toBeTruthy();

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toContain('Multiply');

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
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it.skip('creates two conditional property connections with two separate if functions', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '$if(/ns0:Root/ConditionalMapping/ItemPrice)': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
              ItemQuantity: '/ns0:Root/ConditionalMapping/ItemQuantity',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('Multiply');
        expect(resultEntries[0][1].inputs[1]).toEqual('200');

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs.length).toBeGreaterThan(1);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs.length).toBeGreaterThan(1);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toContain('Multiply');

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
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a simple conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '$if(is-greater-than(/ns0:Root/ConditionalMapping/ItemQuantity, 200))': {
            ConditionalMapping: {
              ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(7);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemQuantity');
        isEqualToCustomValue('200', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
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
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
      });

      it('creates a conditional object connection', () => {
        simpleMap['ns0:Root'] = {
          '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-greater-than(multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity), 200))':
            {
              ConditionalMapping: {
                ItemPrice: '/ns0:Root/ConditionalMapping/ItemPrice',
                ItemDiscount: 'multiply(/ns0:Root/ConditionalMapping/ItemPrice, /ns0:Root/ConditionalMapping/ItemQuantity, 0.05)',
              },
            },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(10);

        expect(resultEntries[0][0]).toContain('IsGreater');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('Multiply');
        isEqualToCustomValue('200', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        // Non-deterministic about which Multiply will come first
        expect(resultEntries[1][0]).toContain('Multiply');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].inputs.length).toBeGreaterThan(1);
        expect(resultEntries[1][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[2][0]).toContain('Multiply');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].inputs.length).toBeGreaterThan(1);
        expect(resultEntries[2][1].outputs.length).toBeGreaterThan(0);

        expect(resultEntries[3][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping');
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
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemDiscount');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0] as NodeConnection).reactFlowKey).toContain('Multiply');

        expect(resultEntries[9][0]).toEqual('target-/ns0:Root/ConditionalMapping/ItemPrice');
        expect(resultEntries[9][1]).toBeTruthy();
        expect((resultEntries[9][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/ConditionalMapping/ItemPrice');
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, []);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
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

      it('loop adjacent connection with child', () => {
        simpleMap['ns0:Root'] = {
          '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$for(/ns0:Root/Nested)': {
            Nested: {
              '6746506B-6072-41DE-8B64-81CE6E7AF999-$for(A)': {
                A: {
                  Name: 'Name',
                },
              },
              '7646506B-6072-41DE-8B64-81CE6E7AF99-$for(A)': {
                B: {
                  Name: 'Name',
                },
              },
            },
          },
        };

        const extendedAdjSchema = convertSchemaToSchemaExtended(adjacentLoopsSchema as any as DataMapSchema);

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedAdjSchema, extendedAdjSchema, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        const firstLoopConnection = getConnectionsForFlowId(result, 'source-/ns0:Root/Nested');
        expect(firstLoopConnection).toBeDefined();
        expect(firstLoopConnection.outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Nested');

        const a = getConnectionsForFlowId(result, 'source-/ns0:Root/Nested/A');
        expect(a).toBeDefined();
        expect(a.outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Nested/A');
        const aName = getConnectionsForFlowId(result, 'source-/ns0:Root/Nested/A/Name');
        expect(aName).toBeDefined();
        expect(aName.outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Nested/A/Name');
        expect(a.outputs[1].reactFlowKey).toEqual('target-/ns0:Root/Nested/B');
        expect(aName.outputs[1].reactFlowKey).toEqual('target-/ns0:Root/Nested/B/Name');
      });

      it('loop adjacent connection', () => {
        simpleMap['ns0:Root'] = {
          '6746506B-6072-41DE-8B64-81CE6E7AF9DC-$for(/ns0:Root/FirstLoop)': {
            FirstLoop: {
              Name: 'Name',
            },
          },
          'B6B8E621-77A3-457B-9F09-6AA224F005DF-$for(/ns0:Root/FirstLoop)': {
            SecondLoop: {
              Number: 'Name',
            },
          },
        };

        const extendedAdjSchema = convertSchemaToSchemaExtended(adjacentLoopsSchema as any as DataMapSchema);

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedAdjSchema, extendedAdjSchema, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        const firstLoopConnection = getConnectionsForFlowId(result, 'source-/ns0:Root/FirstLoop');
        expect(firstLoopConnection).toBeDefined();
        expect(firstLoopConnection.outputs[0].reactFlowKey).toEqual('target-/ns0:Root/FirstLoop');
        expect(firstLoopConnection.outputs[1].reactFlowKey).toEqual('target-/ns0:Root/SecondLoop');

        const name = getConnectionsForFlowId(result, 'source-/ns0:Root/FirstLoop/Name');
        expect(name).toBeDefined();
        expect(name.outputs[0].reactFlowKey).toEqual('target-/ns0:Root/FirstLoop/Name');
        expect(name.outputs[1].reactFlowKey).toEqual('target-/ns0:Root/SecondLoop/Number');
      });

      const getConnectionsForFlowId = (definition: ConnectionDictionary, id: string) => {
        return definition[id];
      };

      it('creates a loop connection with two functions below it', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$for(/ns0:Root/Looping/Employee)': {
              Person: {
                Name: 'is-null(TelephoneNumber)',
                Address: 'is-null(TelephoneNumber)',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        expect(resultEntries[0][0]).toContain('IsNull');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(resultEntries[0][1].outputs[1].reactFlowKey).toEqual('target-/ns0:Root/Looping/Person/Address');
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');

        expect((resultEntries[4][1].inputs[0] as NodeConnection).node).toBeDefined();

        // loop connection
        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Looping/Person');
      });

      it.skip('creates a loop connection with two connections to loop', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(/ns0:Root/Looping/Employee)': {
              Person: {
                Name: 'TelephoneNumber',
              },
              Trips: {
                Trip: {
                  Distance: 'TelephoneNumber',
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, []);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(result['source-/ns0:Root/Looping/Employee'].outputs[0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(result['source-/ns0:Root/Looping/Employee'].outputs[1]).toEqual('target-/ns0:Root/Looping/Trips/Trip');
      });

      it('creates a loop connection and an index', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            Trips: {
              '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$for(/ns0:Root/Looping/VehicleTrips/Trips, $a)': {
                Trip: {
                  VehicleRegistration: '$a',
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        const indexId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(indexId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/Looping/VehicleTrips/Trips');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/Looping/Trips/Trip');
        expect(resultEntries[0][1].outputs[1].reactFlowKey).toEqual('target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/VehicleTrips/Trips');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[2][0]).toEqual('target-/ns0:Root/Looping/Trips/Trip');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[3][0]).toEqual('target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
      });

      it('creates a looping conditional connection', () => {
        simpleMap['ns0:Root'] = {
          ConditionalLooping: {
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$for(/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product)': {
              CategorizedCatalog: {
                '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$if(is-equal(substring(SKU, 1, 2), "1"))': {
                  PetProduct: {
                    Name: 'Name',
                  },
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(9);

        expect(resultEntries[0][0]).toContain('IsEqual');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('SubString');
        isEqualToCustomValue('"1"', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[1][0]).toContain('SubString');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product/SKU'
        );
        isEqualToCustomValue('1', resultEntries[1][1].inputs[1]);
        isEqualToCustomValue('2', resultEntries[1][1].inputs[2]);
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toContain('IsEqual');

        expect(resultEntries[2][0]).toContain(ifPseudoFunctionKey);
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsEqual');
        expect((resultEntries[2][1].inputs[1] as NodeConnection).reactFlowKey).toEqual(
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
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:Root/ConditionalLooping/FlatterCatalog/ns0:Product'
        );

        expect(resultEntries[7][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toContain(ifPseudoFunctionKey);

        expect(resultEntries[8][0]).toEqual('target-/ns0:Root/ConditionalLooping/CategorizedCatalog/PetProduct/Name');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(9);
        const day1NameConnection = result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name'].inputs[0];
        isEqualToCustomValue('"Day 1"', day1NameConnection);
        const day2NameConnection = result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name'].inputs[0];
        isEqualToCustomValue('"Day 2"', day2NameConnection);

        const directAccess1Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure'].inputs[0] as NodeConnection)
          .reactFlowKey;
        const directAccess2Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature'].inputs[0] as NodeConnection)
          .reactFlowKey;

        expect(directAccess1Key).toContain(directAccessPseudoFunctionKey);
        expect(directAccess2Key).toContain(directAccessPseudoFunctionKey);

        expect((result[directAccess1Key].inputs[0] as CustomValueConnection).value).toBe('1');
        expect((result[directAccess1Key].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');
        expect((result[directAccess1Key].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );

        expect((result[directAccess2Key].inputs[0] as CustomValueConnection).value).toBe('2');
        expect((result[directAccess2Key].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');
        expect((result[directAccess2Key].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Temperature'
        );
      });

      it.skip('creates a custom value direct access connection without duplicate function', () => {
        simpleMap['ns0:Root'] = {
          LoopingWithIndex: {
            WeatherSummary: {
              Day1: {
                Name: '"Day 1"',
                Pressure: '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure',
                WindSpeed: '/ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure',
              },
              Day2: {
                Name: '"Day 2"',
                Temperature: '/ns0:Root/LoopingWithIndex/WeatherReport[2]/@Temperature',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(9);
        expect((result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Name'].inputs[0] as CustomValueConnection).value).toBe(
          '"Day 1"'
        );
        expect((result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Name'].inputs[0] as CustomValueConnection).value).toBe(
          '"Day 2"'
        );

        const directAccess1Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day1/Pressure'].inputs[0] as NodeConnection)
          .reactFlowKey;
        const directAccess2Key = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day2/Temperature'].inputs[0] as NodeConnection)
          .reactFlowKey;

        expect(directAccess1Key).toContain(directAccessPseudoFunctionKey);
        expect(directAccess2Key).toContain(directAccessPseudoFunctionKey);

        expect((result[directAccess1Key].inputs[0] as CustomValueConnection).value).toBe('1');
        expect((result[directAccess1Key].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');
        expect((result[directAccess1Key].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );

        expect((result[directAccess2Key].inputs[0] as CustomValueConnection).value).toBe('2');
        expect((result[directAccess2Key].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');
        expect((result[directAccess2Key].inputs[2] as NodeConnection).reactFlowKey).toBe(
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(12);

        const indexRfKey = (result['target-/ns0:Root/Looping/Trips/Trip'].inputs[0] as NodeConnection).reactFlowKey;
        expect(indexRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Trips');

        const directAccessRfKey1 = (result['target-/ns0:Root/Looping/Trips/Trip/VehicleRegistration'].inputs[0] as NodeConnection)
          .reactFlowKey;
        expect(directAccessRfKey1).toContain(directAccessPseudoFunctionKey);
        const isEqualRfKey = (result[directAccessRfKey1].inputs[0] as NodeConnection).reactFlowKey;
        expect(isEqualRfKey).toContain('IsEqual');
        expect((result[directAccessRfKey1].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Vehicle');
        expect((result[directAccessRfKey1].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        const directAccessRfKey2 = (result['target-/ns0:Root/Looping/Trips/Trip/Distance'].inputs[0] as NodeConnection).reactFlowKey;
        expect(directAccessRfKey2).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey2].inputs[0] as NodeConnection).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey2].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Vehicle');
        expect((result[directAccessRfKey2].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Vehicle/VehicleRegistration'
        );

        expect((result[isEqualRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/Looping/VehicleTrips/Trips/VehicleId'
        );
        const directAccessRfKey3 = (result[isEqualRfKey].inputs[1] as NodeConnection).reactFlowKey;
        expect(directAccessRfKey3).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey3].inputs[0] as NodeConnection).reactFlowKey).toBe(indexRfKey);
        expect((result[directAccessRfKey3].inputs[1] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/Looping/VehicleTrips/Trips');
        expect((result[directAccessRfKey3].inputs[2] as NodeConnection).reactFlowKey).toBe(
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(9);

        const indexFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[0] as NodeConnection).reactFlowKey;
        expect(indexFnRfKey).toContain(indexPseudoFunctionKey);
        expect((result[indexFnRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe('source-/ns0:Root/LoopingWithIndex/WeatherReport');

        const conditionalFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day'].inputs[1] as NodeConnection)
          .reactFlowKey;
        expect(conditionalFnRfKey).toContain(ifPseudoFunctionKey);
        expect((result[conditionalFnRfKey].inputs[1] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport'
        );
        const greaterFnRfKey = (result[conditionalFnRfKey].inputs[0] as NodeConnection).reactFlowKey;
        expect(greaterFnRfKey).toContain('IsGreater');
        expect((result[greaterFnRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe(indexFnRfKey);
        expect((result[greaterFnRfKey].inputs[1] as CustomValueConnection).value).toBe('2');

        const concatFnRfKey = (result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Name'].inputs[0] as NodeConnection)
          .reactFlowKey;
        expect(concatFnRfKey).toContain('Concat');
        expect((result[concatFnRfKey].inputs[0] as CustomValueConnection).value).toBe('"Day "');
        expect((result[concatFnRfKey].inputs[1] as NodeConnection).reactFlowKey).toBe(indexFnRfKey);

        expect((result['target-/ns0:Root/LoopingWithIndex/WeatherSummary/Day/Pressure'].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/LoopingWithIndex/WeatherReport/@Pressure'
        );
      });

      it('creates a many-to-many loop connections', () => {
        const extendedLoopSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedLoopTarget = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedLoopSource, extendedLoopTarget, []);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        expect(Object.entries(result).length).toEqual(8);

        expect((result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple'].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple'
        );
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild'].inputs[0] as NodeConnection).reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild');
        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild'].inputs[0] as NodeConnection)
            .reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild');

        expect(
          (result['target-/ns0:TargetSchemaRoot/Looping/ManyToMany/Simple/SimpleChild/SimpleChildChild/Direct'].inputs[0] as NodeConnection)
            .reactFlowKey
        ).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect');
      });

      it('creates a many-to-one loop connections', () => {
        const extendedComprehensiveSourceSchema = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedComprehensiveTargetSchema = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            ManyToOne: {
              '$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple)': {
                '$for(SourceSimpleChild)': {
                  '$for(SourceSimpleChildChild)': {
                    Simple: {
                      Direct: 'SourceDirect',
                    },
                  },
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        expect(resultEntries[0][0]).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple');

        expect(resultEntries[1][0]).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple');

        expect(resultEntries[2][0]).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple');

        expect(resultEntries[3][0]).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct');

        expect(resultEntries[4][0]).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple');
        expect(resultEntries[4][1]).toBeTruthy();

        const loopInputs = resultEntries[4][1].inputs.sort((conn1, conn2) =>
          (conn2 as NodeConnection).reactFlowKey.localeCompare((conn1 as NodeConnection).reactFlowKey)
        );
        expect((loopInputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect((loopInputs[1] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'
        );
        expect((loopInputs[2] as NodeConnection).reactFlowKey).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple');

        expect(resultEntries[5][0]).toEqual('target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
      });

      it('creates a many-to-one loop connection with nested index variables', () => {
        const extendedComprehensiveSourceSchema = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedComprehensiveTargetSchema = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(10);

        const indexRfKey1 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0] as NodeConnection).reactFlowKey;
        expect(indexRfKey1).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey1].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'
        );

        const indexRfKey2 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[1] as NodeConnection).reactFlowKey;
        expect(indexRfKey2).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey2].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'
        );

        const indexRfKey3 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[2] as NodeConnection).reactFlowKey;
        expect(indexRfKey3).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey3].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );

        const directAccessRfKey = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct'].inputs[0] as NodeConnection)
          .reactFlowKey;
        expect(directAccessRfKey).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe(indexRfKey2);
        expect((result[directAccessRfKey].inputs[1] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect((result[directAccessRfKey].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
      });

      it('creates a loop connection with dot access', () => {
        const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
        const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, []);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(3);

        expect((result['target-/ns0:Root/NameValueTransforms/PO_Status/Product'].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem'
        );
        expect(
          (result['target-/ns0:Root/NameValueTransforms/PO_Status/Product/ProductIdentifier'].inputs[0] as NodeConnection).reactFlowKey
        ).toBe('source-/ns0:Root/NameValueTransforms/PurchaseOrderStatus/ns0:LineItem');
      });

      it('creates a loop connection with backout access', () => {
        const mockNestedTestSchema: DataMapSchema = deepNestedSequenceAndObject;
        const extendedComprehensiveSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(mockNestedTestSchema);
        const mockComprehensiveTargetSchema: DataMapSchema = targetMockSchema;
        const extendedComprehensiveTargetSchema: SchemaExtended = convertSchemaToSchemaExtended(mockComprehensiveTargetSchema);
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(/ns0:bookstore/ns0:book)': {
              '$for(ns0:book2)': {
                '$for(ns0:book3)': {
                  Person: {
                    Address: 'ns0:name',
                    Name: '../ns0:author/ns0:first-name',
                  },
                },
              },
            },
          },
        };
        const mapDefinitionDeserializer = new MapDefinitionDeserializer(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);

        // target-/ns0:Root/Looping/Person/Address
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:bookstore/ns0:book/ns0:book2/ns0:book3/ns0:name'
        );
        // target-/ns0:Root/Looping/Person/Name
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:bookstore/ns0:book/ns0:book2/ns0:author/ns0:first-name'
        );
      });

      it('If-Else test', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              Name: 'if-then-else(is-greater-than(/ns0:Root/DirectTranslation/EmployeeID, 10), /ns0:Root/DirectTranslation/EmployeeName, "Custom")',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(5);

        expect(resultEntries[0][0]).toContain('IfElse');
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IsGreater');
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        isEqualToCustomValue('"Custom"', resultEntries[0][1].inputs[2]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toContain('IsGreater');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeID');
        isEqualToCustomValue('10', resultEntries[1][1].inputs[1]);
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toContain('IfElse');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeID');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toContain('IsGreater');

        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toContain('IfElse');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toContain('IfElse');
      });

      it('Everything test', () => {
        const extendedSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedTarget = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
        simpleMap['ns0:TargetSchemaRoot'] = {
          Looping: {
            OneToOne: {
              '$for(/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest, $a)': {
                StressTest: {
                  '$if(is-greater-than($a, 3))': {
                    Direct: '/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest[$a]/SourceDirect',
                  },
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        const isGreaterId = resultEntries[0][0];
        const directAccessId = resultEntries[1][0];
        const ifId = resultEntries[2][0];
        const indexId = resultEntries[3][0];

        expect(resultEntries[0][0]).toEqual(isGreaterId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
        expect(isEqualToCustomValue('3', resultEntries[0][1].inputs[1]));
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[1][0]).toEqual(directAccessId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest'
        );
        expect((resultEntries[1][1].inputs[2] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest/SourceDirect'
        );
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[2][0]).toEqual(ifId);
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(isGreaterId);
        expect((resultEntries[2][1].inputs[1] as NodeConnection).reactFlowKey).toEqual(directAccessId);
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest/Direct');

        expect(resultEntries[3][0]).toEqual(indexId);
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest'
        );
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest');
        expect(resultEntries[3][1].outputs[1].reactFlowKey).toEqual(isGreaterId);
        expect(resultEntries[3][1].outputs[2].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[4][0]).toEqual('source-/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[1].reactFlowKey).toEqual(directAccessId);
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[5][0]).toEqual('source-/ns0:SourceSchemaRoot/Looping/OneToOne/StressTest/SourceDirect');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[6][0]).toEqual('target-/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[7][0]).toEqual('target-/ns0:TargetSchemaRoot/Looping/OneToOne/StressTest/Direct');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(ifId);
      });
    });

    simpleMap['ns0:Root'] = {
      DirectTranslation: {
        Employee: {
          InvalidParent: {
            Child: 'abc',
          },
          Name: '/ns0:Root/DirectTranslation/EmployeeName',
        },
      },
    };

    describe('catches errors while preserving valid connections', () => {
      it('continues after finding invalid target node', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              InvalidName: '/ns0:Root/DirectTranslation/EmployeeName',
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });

      it('continues after finding invalid source node', () => {
        simpleMap['ns0:Root'] = {
          DirectTranslation: {
            Employee: {
              ID: '/ns0:Root/DirectTranslation/InvalidSource',
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });

      it('continues after not finding source loop node', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(/ns0:Root/Looping/EmployeeInvalid)': {
              Person: {
                Name: 'Name',
              },
            },
          },
          DirectTranslation: {
            Employee: {
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });

      it('continues after not finding relative source in a loop', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(/ns0:Root/Looping/Employee)': {
              Person: {
                Name: '../DoesNotExist',
              },
            },
          },
          DirectTranslation: {
            Employee: {
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].outputs[0] as NodeConnection).reactFlowKey).toEqual('target-/ns0:Root/Looping/Person');

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });

      it('continues after not finding source loop node with sequence', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(reverse(/ns0:Root/Looping/EmployeeDoesNotExist))': {
              Person: {
                Name: 'Name',
              },
            },
          },
          DirectTranslation: {
            Employee: {
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });

      it('continues after not finding source conditional node', () => {
        simpleMap['ns0:Root'] = {
          ConditionalMapping: {
            '$if(/ns0:Root/ConditionalMapping/ItemQuantityDoesNotExist)': {
              ItemDiscount: '/ns0:Root/ConditionalMapping/ItemPrice',
            },
          },
          DirectTranslation: {
            Employee: {
              Name: '/ns0:Root/DirectTranslation/EmployeeName',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');

        expect(resultEntries[1][0]).toEqual('target-/ns0:Root/DirectTranslation/Employee/Name');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/DirectTranslation/EmployeeName');

        expect(mapDefinitionDeserializer.getWarningMessages().length).toEqual(1);
      });
    });

    const getFirstInputReactFlowKey = (conn: Connection) => (conn.inputs[0] as NodeConnection).reactFlowKey;
    const getSecondInputReactFlowKey = (conn: Connection) => (conn.inputs[1] as NodeConnection).reactFlowKey;

    describe('sequences', () => {
      it('creates a simple sequence function', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(reverse(/ns0:Root/Looping/Employee))': {
              Person: {
                Name: 'Name',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][0].startsWith('Reverse')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/Looping/Employee/Name');

        expect(resultEntries[3][0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(getFirstInputReactFlowKey(resultEntries[3][1]).startsWith('Reverse')).toBeTruthy();

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(getFirstInputReactFlowKey(resultEntries[4][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');
      });

      it('creates nested sequences', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '6746506B-6072-41DE-8B64-81CE6E7AF9DD-$for(reverse(distinct-values(/ns0:Root/Looping/Employee,/ns0:Root/Looping/Employee/Name)))':
              {
                Person: {
                  Name: 'Name',
                },
              },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][0].startsWith('DistinctValues')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee');
        expect(getSecondInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');

        expect(resultEntries[1][0].startsWith('Reverse')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[1][1]).startsWith('DistinctValues')).toBeTruthy();

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/Looping/Employee/Name');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(getFirstInputReactFlowKey(resultEntries[4][1]).startsWith('Reverse')).toBeTruthy();

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(getFirstInputReactFlowKey(resultEntries[5][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');
      });

      it('creates a simple sequence function with multiple mapped children', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(reverse(/ns0:Root/Looping/Employee))': {
              Person: {
                Name: 'Name',
                Other: 'TelephoneNumber',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][0].startsWith('Reverse')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/Looping/Employee/Name');
        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(getFirstInputReactFlowKey(resultEntries[4][1]).startsWith('Reverse')).toBeTruthy();

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(getFirstInputReactFlowKey(resultEntries[5][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/Looping/Person/Other');
        expect(getFirstInputReactFlowKey(resultEntries[6][1])).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');
      });

      it('creates a simple sequence function with mapped children with functions', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(reverse(/ns0:Root/Looping/Employee))': {
              Person: {
                Name: 'Name',
                Other: 'TelephoneNumber',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][0].startsWith('Reverse')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee');

        expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/Looping/Employee/Name');
        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');

        expect(resultEntries[4][0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(getFirstInputReactFlowKey(resultEntries[4][1]).startsWith('Reverse')).toBeTruthy();

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(getFirstInputReactFlowKey(resultEntries[5][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/Looping/Person/Other');
        expect(getFirstInputReactFlowKey(resultEntries[6][1])).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');
      });

      it('creates nested sequence functions with multiple inputs', () => {
        simpleMap['ns0:Root'] = {
          Looping: {
            '$for(sub-sequence(reverse(/ns0:Root/Looping/Employee),/ns0:Root/Looping/Employee/Salary, 2))': {
              Person: {
                Name: 'Name',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries[0][0].startsWith('Reverse')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[0][1])).toEqual('source-/ns0:Root/Looping/Employee');

        expect(resultEntries[1][0].startsWith('Subsequence')).toBeTruthy();
        expect(getFirstInputReactFlowKey(resultEntries[1][1]).startsWith('Reverse'));
        expect(getSecondInputReactFlowKey(resultEntries[1][1])).toEqual('source-/ns0:Root/Looping/Employee/Salary');

        expect(resultEntries[2][0]).toEqual('source-/ns0:Root/Looping/Employee');
        expect(resultEntries[3][0]).toEqual('source-/ns0:Root/Looping/Employee/Name');
        expect(resultEntries[4][0]).toEqual('source-/ns0:Root/Looping/Employee/Salary');

        expect(resultEntries[5][0]).toEqual('target-/ns0:Root/Looping/Person');
        expect(getFirstInputReactFlowKey(resultEntries[5][1]).startsWith('Subsequence')).toBeTruthy();

        expect(resultEntries[6][0]).toEqual('target-/ns0:Root/Looping/Person/Name');
        expect(getFirstInputReactFlowKey(resultEntries[6][1])).toEqual('source-/ns0:Root/Looping/Employee/Name');
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
    };
    const extendedSource = convertSchemaToSchemaExtended(sourceMockJsonSchema);
    const extendedTarget = convertSchemaToSchemaExtended(targetMockJsonSchema);

    describe('convertFromMapDefinition', () => {
      // danielle need test case where array item is not parent

      it('creates a simple connection between one source and target node', () => {
        simpleMap['root'] = {
          String1: '/root/OrderNo',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(2);

        expect(resultEntries[0][0]).toEqual('source-/root/OrderNo');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[1][0]).toEqual('target-/root/String1');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/OrderNo');
      });

      it('creates a connection between a custom value and target node', () => {
        simpleMap['root'] = {
          String1: '"A String"',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(1);

        expect(resultEntries[0][0]).toEqual('target-/root/String1');
        expect(resultEntries[0][1]).toBeTruthy();
        isEqualToCustomValue('"A String"', resultEntries[0][1].inputs[0]);
      });

      it('creates a simple connection between one source, one function and one target', () => {
        simpleMap['root'] = {
          String1: 'concat(/root/OrderNo)',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/OrderNo');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[1][0]).toEqual('source-/root/OrderNo');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/root/String1');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);
      });

      it('creates a connection between a content enricher function and target', () => {
        simpleMap['root'] = {
          String1: 'string(current-date())',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        const currentDateId = resultEntries[0][0];
        const toStringId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(currentDateId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(toStringId);

        expect(resultEntries[1][0]).toEqual(toStringId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(currentDateId);
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[2][0]).toEqual('target-/root/String1');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(toStringId);
      });

      it('creates a connection between a source, a function with custom value and a target', () => {
        simpleMap['root'] = {
          String1: 'concat("Order Number: ", /root/OrderNo)',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        const concatId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        isEqualToCustomValue('"Order Number: "', resultEntries[0][1].inputs[0]);
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/OrderNo');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[1][0]).toEqual('source-/root/OrderNo');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(concatId);

        expect(resultEntries[2][0]).toEqual('target-/root/String1');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);
      });

      it('creates a simple conditional property connection', () => {
        simpleMap['root'] = {
          String1: '/root/OrderNo',
          '$if(is-greater-than(/root/Num, 10))': {
            T2: '/root/Num',
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        const isGreaterId = resultEntries[0][0];
        const ifId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(isGreaterId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Num');
        isEqualToCustomValue('10', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[1][0]).toEqual(ifId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(isGreaterId);
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/Num');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/T2');

        expect(resultEntries[2][0]).toEqual('source-/root/Num');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(isGreaterId);

        expect(resultEntries[3][0]).toEqual('source-/root/OrderNo');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[4][0]).toEqual('target-/root/String1');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/OrderNo');

        expect(resultEntries[5][0]).toEqual('target-/root/T2');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(ifId);
      });

      it('creates a simple conditional object connection', () => {
        simpleMap['root'] = {
          '$if(is-greater-than(/root/Num, 10))': {
            Object1: {
              String1: '/root/OrderNo',
              Num1: '/root/Num',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(8);

        const isGreaterId = resultEntries[0][0];
        const ifId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(isGreaterId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Num');
        isEqualToCustomValue('10', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[1][0]).toEqual(ifId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(isGreaterId);
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/Object1');

        expect(resultEntries[2][0]).toEqual('source-/root');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[3][0]).toEqual('source-/root/Num');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual(isGreaterId);

        expect(resultEntries[4][0]).toEqual('source-/root/OrderNo');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual('target-/root/Object1/String1');

        expect(resultEntries[5][0]).toEqual('target-/root/Object1');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(ifId);

        expect(resultEntries[6][0]).toEqual('target-/root/Object1/Num1');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Num');

        expect(resultEntries[7][0]).toEqual('target-/root/Object1/String1');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/OrderNo');
      });

      it('creates a loop connection for json', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*)': {
              F1: 'Num',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        expect(resultEntries[0][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');

        expect(resultEntries[1][0]).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[2][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');

        expect(resultEntries[3][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*/Num');
      });

      it('creates a index loop and index is used', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*, $a)': {
              F1: '$a',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        const indexId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(indexId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[0][1].outputs[1].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[1][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[2][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[3][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
      });

      it('creates a index loop and index is unused', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*, $a)': {
              F1: 'Num',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(5);

        const indexId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(indexId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');

        expect(resultEntries[1][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[2][0]).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[3][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[4][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*/Num');
      });

      it('creates connections for nested functions within a loop', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*)': {
              F1: 'multiply(count(Num), /root/Num)',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(7);

        const countId = resultEntries[0][0];
        const multiplyId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(countId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(multiplyId);

        expect(resultEntries[1][0]).toEqual(multiplyId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(countId);
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/Num');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[2][0]).toEqual('source-/root/Num');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(multiplyId);

        expect(resultEntries[3][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');

        expect(resultEntries[4][0]).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual(countId);

        expect(resultEntries[5][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');

        expect(resultEntries[6][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(multiplyId);
      });

      it.skip('creates a looping conditional connection', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*)': {
              '$if(is-greater-than(10, 20))': {
                F1: 'Num',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        const isGreaterId = resultEntries[0][0];
        const ifId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(isGreaterId);
        expect(resultEntries[0][1]).toBeTruthy();
        isEqualToCustomValue('10', resultEntries[0][1].inputs[0]);
        isEqualToCustomValue('20', resultEntries[0][1].inputs[1]);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[1][0]).toEqual(ifId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(isGreaterId);
        expect((resultEntries[1][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');

        expect(resultEntries[2][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[3][0]).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[4][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(ifId);

        expect(resultEntries[5][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*/Num');
      });

      it('creates a custom value direct access connection', () => {
        simpleMap['root'] = {
          String1: '/root/Strings/*[1]/String',
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(4);

        const directAccessId = resultEntries[0][0];

        expect(resultEntries[0][0]).toEqual(directAccessId);
        expect(resultEntries[0][1]).toBeTruthy();
        isEqualToCustomValue('1', resultEntries[0][1].inputs[0]);
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/Strings/*');
        expect((resultEntries[0][1].inputs[2] as NodeConnection).reactFlowKey).toEqual('source-/root/Strings/*/String');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/String1');

        expect(resultEntries[1][0]).toEqual('source-/root/Strings/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[2][0]).toEqual('source-/root/Strings/*/String');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[3][0]).toEqual('target-/root/String1');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(directAccessId);
      });

      it('creates a looping connection w/ index variable and direct access', () => {
        simpleMap['root'] = {
          ComplexArray1: {
            '$for(/root/Nums/*, $a)': {
              F1: '/root/Nums/*[$a]/Num',
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(6);

        const directAccessId = resultEntries[0][0];
        const indexId = resultEntries[1][0];

        expect(resultEntries[0][0]).toEqual(directAccessId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
        expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');
        expect((resultEntries[0][1].inputs[2] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

        expect(resultEntries[1][0]).toEqual(indexId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/Nums/*');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[1][1].outputs[1].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[2][0]).toEqual('source-/root/Nums/*');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[3][0]).toEqual('source-/root/Nums/*/Num');
        expect(resultEntries[3][1]).toBeTruthy();
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual(directAccessId);

        expect(resultEntries[4][0]).toEqual('target-/root/ComplexArray1/*');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[5][0]).toEqual('target-/root/ComplexArray1/*/F1');
        expect(resultEntries[5][1]).toBeTruthy();
        expect((resultEntries[5][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(directAccessId);
      });

      it.skip('creates a looping connection w/ index variable and conditional', () => {
        simpleMap['root'] = {
          ForLoop: {
            '$for(/root/text/*, $a)': {
              '$if(is-greater-than($a, 2))': {
                prop1: {
                  TEL_NUMBER: 'itemNumber',
                  TEL_EXTENS: 'concat("Ext", " ", $a)',
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(10);

        const concatId = resultEntries[0][0];
        const isGreaterId = resultEntries[1][0];
        const ifId = resultEntries[2][0];
        const indexId = resultEntries[3][0];

        expect(resultEntries[0][0]).toEqual(concatId);
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].inputs[0]).toEqual('"Ext"');
        expect(resultEntries[0][1].inputs[1]).toEqual('" "');
        expect((resultEntries[0][1].inputs[2] as NodeConnection).reactFlowKey).toEqual(indexId);
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ForLoop/*/prop1/TEL_EXTENS');

        expect(resultEntries[1][0]).toEqual(isGreaterId);
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);
        expect(resultEntries[1][1].inputs[1]).toEqual('2');
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual(ifId);

        expect(resultEntries[2][0]).toEqual(ifId);
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(isGreaterId);
        expect((resultEntries[2][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/text/*');
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/root/ForLoop/*/prop1');

        expect(resultEntries[3][0]).toEqual(indexId);
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/text/*');
        expect(resultEntries[3][1].outputs[0].reactFlowKey).toEqual(isGreaterId);
        expect(resultEntries[3][1].outputs[1].reactFlowKey).toEqual('target-/root/ForLoop/*');
        expect(resultEntries[3][1].outputs[2].reactFlowKey).toEqual(concatId);

        expect(resultEntries[4][0]).toEqual('source-/root/text/*');
        expect(resultEntries[4][1]).toBeTruthy();
        expect(resultEntries[4][1].outputs[0].reactFlowKey).toEqual(indexId);

        expect(resultEntries[5][0]).toEqual('source-/root/text/*/itemNumber');
        expect(resultEntries[5][1]).toBeTruthy();
        expect(resultEntries[5][1].outputs[0].reactFlowKey).toEqual('target-/root/ForLoop/*/prop1/TEL_NUMBER');

        expect(resultEntries[6][0]).toEqual('target-/root/ForLoop/*');
        expect(resultEntries[6][1]).toBeTruthy();
        expect((resultEntries[6][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(indexId);

        expect(resultEntries[7][0]).toEqual('target-/root/ForLoop/*/prop1');
        expect(resultEntries[7][1]).toBeTruthy();
        expect((resultEntries[7][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(ifId);

        expect(resultEntries[8][0]).toEqual('target-/root/ForLoop/*/prop1/TEL_EXTENS');
        expect(resultEntries[8][1]).toBeTruthy();
        expect((resultEntries[8][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(concatId);

        expect(resultEntries[9][0]).toEqual('target-/root/ForLoop/*/prop1/TEL_NUMBER');
        expect(resultEntries[9][1]).toBeTruthy();
        expect((resultEntries[9][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/text/*/itemNumber');
      });

      it.skip('creates a many-to-one loop connections', () => {
        simpleMap['root'] = {
          TargetMadeUp: {
            ManySingleArray: {
              '$for(/root/SourceMadeUp/ManySingleArray/*)': {
                '$for(*)': {
                  TargetMadeUp_NeedAProp: 'SourceMadeUp_NeedAProp',
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(5);

        expect(resultEntries[0][0]).toEqual('source-/root/SourceMadeUp/ManySingleArray/*');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManySingleArray/*');

        expect(resultEntries[1][0]).toEqual('source-/root/SourceMadeUp/ManySingleArray/*/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManySingleArray/*');

        expect(resultEntries[2][0]).toEqual('source-/root/SourceMadeUp/ManySingleArray/*/*/SourceMadeUp_NeedAProp');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManySingleArray/*/TargetMadeUp_NeedAProp');

        expect(resultEntries[3][0]).toEqual('target-/root/TargetMadeUp/ManySingleArray/*');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/SourceMadeUp/ManySingleArray/*/*');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/SourceMadeUp/ManySingleArray/*');

        expect(resultEntries[4][0]).toEqual('target-/root/TargetMadeUp/ManySingleArray/*/TargetMadeUp_NeedAProp');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/root/SourceMadeUp/ManySingleArray/*/*/SourceMadeUp_NeedAProp'
        );
      });

      it.skip('creates a many-to-many loop connections', () => {
        simpleMap['root'] = {
          TargetMadeUp: {
            ManyManyArray: {
              '$for(/root/SourceMadeUp/ManyManyArray/*)': {
                '$for(*)': {
                  TargetMadeUp_NeedAProp: 'SourceMadeUp_NeedAProp',
                },
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(5);

        expect(resultEntries[0][0]).toEqual('source-/root/SourceMadeUp/ManyManyArray/*');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManyManyArray/*');

        expect(resultEntries[1][0]).toEqual('source-/root/SourceMadeUp/ManyManyArray/*/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManyManyArray/*');

        expect(resultEntries[2][0]).toEqual('source-/root/SourceMadeUp/ManyManyArray/*/*/SourceMadeUp_NeedAProp');
        expect(resultEntries[2][1]).toBeTruthy();
        expect(resultEntries[2][1].outputs[0].reactFlowKey).toEqual('target-/root/TargetMadeUp/ManyManyArray/*/TargetMadeUp_NeedAProp');

        expect(resultEntries[3][0]).toEqual('target-/root/TargetMadeUp/ManyManyArray/*');
        expect(resultEntries[3][1]).toBeTruthy();
        expect((resultEntries[3][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/SourceMadeUp/ManyManyArray/*/*');
        expect((resultEntries[3][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/root/SourceMadeUp/ManyManyArray/*');

        expect(resultEntries[4][0]).toEqual('target-/root/TargetMadeUp/ManyManyArray/*/TargetMadeUp_NeedAProp');
        expect(resultEntries[4][1]).toBeTruthy();
        expect((resultEntries[4][1].inputs[0] as NodeConnection).reactFlowKey).toEqual(
          'source-/root/SourceMadeUp/ManyManyArray/*/*/SourceMadeUp_NeedAProp'
        );
      });

      it.skip('creates a many-to-one loop connection with nested index variables', () => {
        const extendedComprehensiveSourceSchema = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
        const extendedComprehensiveTargetSchema = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
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

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(
          simpleMap,
          extendedComprehensiveSourceSchema,
          extendedComprehensiveTargetSchema,
          functionMock
        );
        const result = mapDefinitionDeserializer.convertFromMapDefinition();

        expect(Object.entries(result).length).toEqual(10);

        const indexRfKey1 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[0] as NodeConnection).reactFlowKey;
        expect(indexRfKey1).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey1].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );

        const indexRfKey2 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[1] as NodeConnection).reactFlowKey;
        expect(indexRfKey2).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey2].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild'
        );

        const indexRfKey3 = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'].inputs[2] as NodeConnection).reactFlowKey;
        expect(indexRfKey3).toContain(indexPseudoFunctionKey);
        expect((result[indexRfKey3].inputs[0] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'
        );

        const directAccessRfKey = (result['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct'].inputs[0] as NodeConnection)
          .reactFlowKey;
        expect(directAccessRfKey).toContain(directAccessPseudoFunctionKey);
        expect((result[directAccessRfKey].inputs[0] as NodeConnection).reactFlowKey).toBe(indexRfKey2);
        expect((result[directAccessRfKey].inputs[1] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild'
        );
        expect((result[directAccessRfKey].inputs[2] as NodeConnection).reactFlowKey).toBe(
          'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
        );
      });

      it('creates a loop connection with dot access', () => {
        simpleMap['root'] = {
          ForLoop: {
            '$for(/root/generalData/address/telephone/*)': {
              prop1: {
                TEL_NUMBER: '.',
              },
            },
          },
        };

        const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
        const result = mapDefinitionDeserializer.convertFromMapDefinition();
        const resultEntries = Object.entries(result);
        resultEntries.sort();

        expect(resultEntries.length).toEqual(3);

        expect(resultEntries[0][0]).toEqual('source-/root/generalData/address/telephone/*');
        expect(resultEntries[0][1]).toBeTruthy();
        expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ForLoop/*');
        expect(resultEntries[0][1].outputs[1].reactFlowKey).toEqual('target-/root/ForLoop/*/prop1/TEL_NUMBER');

        expect(resultEntries[1][0]).toEqual('target-/root/ForLoop/*');
        expect(resultEntries[1][1]).toBeTruthy();
        expect((resultEntries[1][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/generalData/address/telephone/*');

        expect(resultEntries[2][0]).toEqual('target-/root/ForLoop/*/prop1/TEL_NUMBER');
        expect(resultEntries[2][1]).toBeTruthy();
        expect((resultEntries[2][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/root/generalData/address/telephone/*');
      });
    });
  });

  describe('XSD to JSON', () => {
    const simpleMap: MapDefinitionEntry = {
      $version: '1',
      $input: 'XSD',
      $output: 'JSON',
      $sourceSchema: 'SourceSchemaJson.json',
      $targetSchema: 'TargetSchemaJson.json',
    };

    const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
    const extendedTarget = convertSchemaToSchemaExtended(targetMockJsonSchema);

    it('maps a looping XSD to JSON with nested if', () => {
      simpleMap['root'] = {
        ComplexArray1: {
          '$for(/ns0:Root/Looping/Employee)': {
            '$if(Name)': {
              F1: 'TelephoneNumber',
            },
          },
        },
      };

      const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
      const result = mapDefinitionDeserializer.convertFromMapDefinition();
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(6);

      // if
      expect(resultEntries[0][0]).toContain(ifPseudoFunctionKey);
      expect((resultEntries[0][1].inputs[0] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/Looping/Employee/Name');
      expect((resultEntries[0][1].inputs[1] as NodeConnection).reactFlowKey).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');

      // looping
      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee');
      expect(resultEntries[1][1]).toBeTruthy();
      expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');
    });

    it('maps a looping XSD to JSON', () => {
      simpleMap['root'] = {
        ComplexArray1: {
          '$for(/ns0:Root/Looping/Employee)': {
            F1: 'TelephoneNumber',
          },
        },
      };

      const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);
      const result = mapDefinitionDeserializer.convertFromMapDefinition();
      const resultEntries = Object.entries(result);
      resultEntries.sort();

      expect(resultEntries.length).toEqual(4);

      expect(resultEntries[0][0]).toEqual('source-/ns0:Root/Looping/Employee');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*');

      expect(resultEntries[1][0]).toEqual('source-/ns0:Root/Looping/Employee/TelephoneNumber');
      expect(resultEntries[1][1]).toBeTruthy();
      expect(resultEntries[1][1].outputs[0].reactFlowKey).toEqual('target-/root/ComplexArray1/*/F1');
    });
  });
});

describe('getLowestCommonParentForConditional', () => {
  let simpleMap: MapDefinitionEntry = {};

  const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema as any as DataMapSchema);
  const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema as any as DataMapSchema);
  const mapDefinitionDeserializer = new MapDefinitionDeserializer(simpleMap, extendedSource, extendedTarget, functionMock);

  it('gets correct lowest common parent for two nodes', () => {
    const children = ['/ns0:Root/ConditionalMapping/ItemQuantity', '/ns0:Root/ConditionalMapping/ItemPrice'];
    const lowestCommonParent = mapDefinitionDeserializer.getLowestCommonParentForConditional(children);
    expect(lowestCommonParent).toEqual('/ns0:Root/ConditionalMapping');
  });

  it('gets correct lowest common parent when parent is an input', () => {
    const children = ['/ns0:Root/idk/ConditionalMapping/ItemQuantity', '/ns0:Root/idk/ConditionalMapping/ItemPrice', '/ns0:Root/idk'];

    const lowestCommonParent = mapDefinitionDeserializer.getLowestCommonParentForConditional(children);
    expect(lowestCommonParent).toEqual('/ns0:Root/idk');
  });
});

it('gets correct target node for json schema', () => {
  const extendedTarget = convertSchemaToSchemaExtended(targetMockJsonSchema as any as DataMapSchema);
  const root = extendedTarget.schemaTreeRoot;
  const matchingTarget = getLoopTargetNodeWithJson('root/ComplexArray1/F1', root);

  expect((matchingTarget as SchemaNodeExtended).name).toEqual('<ArrayItem>');
});
