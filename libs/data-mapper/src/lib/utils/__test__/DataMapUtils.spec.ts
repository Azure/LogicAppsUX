import {
  layeredLoopSourceMockSchema,
  layeredLoopTargetMockSchema,
  simpleLoopSource,
  simpleLoopTarget,
  sourceMockSchema,
  targetMockSchema,
} from '../../__mocks__';
import type { MapDefinitionEntry } from '../../models';
import { functionMock, ifPseudoFunctionKey, SchemaType } from '../../models';
import type { ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import { addParentConnectionForRepeatingElementsNested, convertFromMapDefinition, getSourceValueFromLoop } from '../DataMap.Utils';
import { convertSchemaToSchemaExtended, flattenSchemaIntoDictionary } from '../Schema.Utils';
import {
  manyToManyConnectionFromSource,
  manyToManyConnectionFromTarget,
  manyToManyConnectionSourceName,
  manyToManyConnectionTargetName,
  manyToOneConnectionFromSource,
  manyToOneConnectionFromTarget,
  manyToOneConnectionSourceName,
  manyToOneConnectionTargetName,
} from '../__mocks__';

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
  const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
  const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema);

  describe('convertFromMapDefinition', () => {
    it('creates a simple connection between one source and target node', () => {
      const result = convertFromMapDefinition(simpleMap, extendedSource, extendedTarget, functionMock);
      expect(result['target-/ns0:Root/DirectTranslation/Employee/Name']).toBeTruthy();
      expect(result['source-/ns0:Root/DirectTranslation/EmployeeName']).toBeTruthy();
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

      expect(resultEntries[0][0]).toContain('target-/ns0:Root/DirectTranslation/Employee/ID');
      expect(resultEntries[0][1]).toBeTruthy();
      expect(resultEntries[0][1].inputs[0][0]).toEqual('10');

      expect(resultEntries[1][0]).toContain('target-/ns0:Root/DirectTranslation/Employee/Name');
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
      // target lists function as input
      const targetInput = result['target-/ns0:Root/DirectTranslation/Employee/Name'].inputs['0'][0] as ConnectionUnit;
      expect(targetInput.reactFlowKey).toContain('Concat');

      // source lists function as output
      const sourceOutput = result['source-/ns0:Root/DirectTranslation/EmployeeName'].outputs[0];
      expect(sourceOutput.reactFlowKey).toContain('Concat');

      // function lists source as input

      // function lists target as output

      expect(Object.keys(result).some((key) => key.includes('Concat')));
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

  describe('getSourceValueFromLoop', () => {
    it('gets the source key from a looped target string', () => {
      const result = getSourceValueFromLoop('TelephoneNumber', '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name');
      expect(result).toEqual('/ns0:Root/Looping/Employee/TelephoneNumber');
    });

    it('gets the source key from a looped target string with a function', () => {
      const result = getSourceValueFromLoop(
        'lower-case(TelephoneNumber)',
        '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name'
      );
      expect(result).toEqual('lower-case(/ns0:Root/Looping/Employee/TelephoneNumber)');
    });

    it('gets the source key from a nested looped target string', () => {
      const result = getSourceValueFromLoop('Day', '/ns0:Root/Ano/$for(/ns0:Root/Year)/Mes/$for(/ns0:Root/Year/Month)/Dia');
      expect(result).toEqual('/ns0:Root/Year/Month/Day');
    });
  });

  describe('addParentConnectionForRepeatingElementsNested', () => {
    const extendedLoopSource = convertSchemaToSchemaExtended(layeredLoopSourceMockSchema);
    const extendedLoopTarget = convertSchemaToSchemaExtended(layeredLoopTargetMockSchema);
    const flattenedLoopSource = flattenSchemaIntoDictionary(extendedLoopSource, SchemaType.Source);
    const flattenedLoopTarget = flattenSchemaIntoDictionary(extendedLoopTarget, SchemaType.Target);

    it('adds parent connections for nested loops', () => {
      const sourceNodeParent = flattenedLoopSource[manyToManyConnectionSourceName];
      const targetNodeParent = flattenedLoopTarget[manyToManyConnectionTargetName];
      const connectionsDict: ConnectionDictionary = {
        [manyToManyConnectionSourceName]: manyToManyConnectionFromSource,
        [manyToManyConnectionTargetName]: manyToManyConnectionFromTarget,
      };
      addParentConnectionForRepeatingElementsNested(
        sourceNodeParent,
        targetNodeParent,
        flattenedLoopSource,
        flattenedLoopTarget,
        connectionsDict
      );
      expect(Object.keys(connectionsDict).length).toEqual(8);
    });

    it('adds parent connections for many-to-one', () => {
      const sourceNodeParent = flattenedLoopSource[manyToOneConnectionSourceName];
      const targetNodeParent = flattenedLoopTarget[manyToOneConnectionTargetName];
      const connectionsDict: ConnectionDictionary = {
        [manyToOneConnectionSourceName]: manyToOneConnectionFromSource,
        [manyToOneConnectionTargetName]: manyToOneConnectionFromTarget,
      };
      addParentConnectionForRepeatingElementsNested(
        sourceNodeParent,
        targetNodeParent,
        flattenedLoopSource,
        flattenedLoopTarget,
        connectionsDict
      );
      // target-date should be connected to src-yr, src-month, src-day
      const parentTarget = connectionsDict['target-/ns0:Root/ManyToOne/Date'];
      const input0 = parentTarget.inputs['0'][0] as ConnectionUnit;
      const input1 = parentTarget.inputs['0'][1] as ConnectionUnit;
      const input2 = parentTarget.inputs['0'][2] as ConnectionUnit;

      expect(input0.reactFlowKey).toEqual('source-/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay');
      expect(input1.reactFlowKey).toEqual('source-/ns0:Root/ManyToOne/SourceYear/SourceMonth');
      expect(input2.reactFlowKey).toEqual('source-/ns0:Root/ManyToOne/SourceYear');
    });

    it('adds parent connections for indexed many-to-one', () => {
      const sourceNodeParent = flattenedLoopSource['source-/ns0:Root/ManyToOne/SourceYear'];
      const targetNodeParent = flattenedLoopTarget['target-/ns0:Root/ManyToOne/Date'];

      addParentConnectionForRepeatingElementsNested(sourceNodeParent, targetNodeParent, flattenedLoopSource, flattenedLoopTarget, indexed);
      const parentTarget = indexed['target-/ns0:Root/ManyToOne/Date'];
      const input0 = parentTarget.inputs['0'];
      expect(input0).toHaveLength(1);
    });
  });
});

const indexed: ConnectionDictionary = {
  'index-6034001E-DCD3-468D-B7B9-84A2E154DE62': {
    self: {
      node: {
        key: 'index',
        maxNumberOfInputs: 1,
        type: 'PseudoFunction',
        functionName: '',
        outputValueType: 'Any',
        inputs: [
          {
            name: 'Loop',
            allowedTypes: ['ComplexType'],
            isOptional: false,
            allowCustomInput: false,
            placeHolder: 'The source loop.',
          },
        ],
        displayName: 'Index',
        category: 'Collection',
        description: 'Adds an index value to the loop',
        children: [],
      },
      reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
    },
    inputs: {
      '0': [
        {
          node: {
            key: '/ns0:Root/ManyToOne/SourceYear',
            name: 'SourceYear',
            schemaNodeDataType: 'None',
            normalizedDataType: 'ComplexType',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                name: 'SourceMonth',
                schemaNodeDataType: 'None',
                normalizedDataType: 'ComplexType',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                    name: 'SourceDay',
                    schemaNodeDataType: 'None',
                    normalizedDataType: 'ComplexType',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                        name: 'SourceDate',
                        schemaNodeDataType: 'String',
                        normalizedDataType: 'String',
                        properties: 'NotSpecified',
                        fullName: 'SourceDate',
                        parentKey: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                        nodeProperties: ['NotSpecified'],
                        children: [],
                        pathToRoot: [
                          {
                            key: '/ns0:Root',
                            name: 'Root',
                            fullName: 'ns0:Root',
                            repeating: false,
                          },
                          {
                            key: '/ns0:Root/ManyToOne',
                            name: 'ManyToOne',
                            fullName: 'ManyToOne',
                            repeating: false,
                          },
                          {
                            key: '/ns0:Root/ManyToOne/SourceYear',
                            name: 'SourceYear',
                            fullName: 'SourceYear',
                            repeating: true,
                          },
                          {
                            key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                            name: 'SourceMonth',
                            fullName: 'SourceMonth',
                            repeating: true,
                          },
                          {
                            key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                            name: 'SourceDay',
                            fullName: 'SourceDay',
                            repeating: true,
                          },
                          {
                            key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                            name: 'SourceDate',
                            fullName: 'SourceDate',
                            repeating: false,
                          },
                        ],
                      },
                    ],
                    fullName: 'SourceDay',
                    parentKey: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                    nodeProperties: ['Repeating'],
                    pathToRoot: [
                      {
                        key: '/ns0:Root',
                        name: 'Root',
                        fullName: 'ns0:Root',
                        repeating: false,
                      },
                      {
                        key: '/ns0:Root/ManyToOne',
                        name: 'ManyToOne',
                        fullName: 'ManyToOne',
                        repeating: false,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear',
                        name: 'SourceYear',
                        fullName: 'SourceYear',
                        repeating: true,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                        name: 'SourceMonth',
                        fullName: 'SourceMonth',
                        repeating: true,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                        name: 'SourceDay',
                        fullName: 'SourceDay',
                        repeating: true,
                      },
                    ],
                  },
                ],
                fullName: 'SourceMonth',
                parentKey: '/ns0:Root/ManyToOne/SourceYear',
                nodeProperties: ['Repeating'],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/ManyToOne',
                    name: 'ManyToOne',
                    fullName: 'ManyToOne',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear',
                    name: 'SourceYear',
                    fullName: 'SourceYear',
                    repeating: true,
                  },
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                    name: 'SourceMonth',
                    fullName: 'SourceMonth',
                    repeating: true,
                  },
                ],
              },
            ],
            fullName: 'SourceYear',
            parentKey: '/ns0:Root/ManyToOne',
            nodeProperties: ['Repeating'],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne',
                name: 'ManyToOne',
                fullName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne/SourceYear',
                name: 'SourceYear',
                fullName: 'SourceYear',
                repeating: true,
              },
            ],
          },
          reactFlowKey: 'source-/ns0:Root/ManyToOne/SourceYear',
        },
      ],
    },
    outputs: [
      {
        node: {
          key: '/ns0:Root/ManyToOne/Date',
          name: 'Date',
          schemaNodeDataType: 'None',
          normalizedDataType: 'ComplexType',
          properties: 'Repeating',
          children: [
            {
              key: '/ns0:Root/ManyToOne/Date/DayName',
              name: 'DayName',
              schemaNodeDataType: 'String',
              normalizedDataType: 'String',
              properties: 'NotSpecified',
              children: [],
              fullName: 'DayName',
              parentKey: '/ns0:Root/ManyToOne/Date',
              nodeProperties: ['NotSpecified'],
              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  fullName: 'ns0:Root',
                  repeating: false,
                },
                {
                  key: '/ns0:Root/ManyToOne',
                  name: 'ManyToOne',
                  fullName: 'ManyToOne',
                  repeating: false,
                },
                {
                  key: '/ns0:Root/ManyToOne/Date',
                  name: 'Date',
                  fullName: 'Date',
                  repeating: true,
                },
                {
                  key: '/ns0:Root/ManyToOne/Date/DayName',
                  name: 'DayName',
                  fullName: 'DayName',
                  repeating: false,
                },
              ],
            },
          ],
          fullName: 'Date',
          parentKey: '/ns0:Root/ManyToOne',
          nodeProperties: ['Repeating'],
          pathToRoot: [
            {
              key: '/ns0:Root',
              name: 'Root',
              fullName: 'ns0:Root',
              repeating: false,
            },
            {
              key: '/ns0:Root/ManyToOne',
              name: 'ManyToOne',
              fullName: 'ManyToOne',
              repeating: false,
            },
            {
              key: '/ns0:Root/ManyToOne/Date',
              name: 'Date',
              fullName: 'Date',
              repeating: true,
            },
          ],
        },
        reactFlowKey: 'target-/ns0:Root/ManyToOne/Date',
      },
    ],
  },
  'source-/ns0:Root/ManyToOne/SourceYear': {
    self: {
      node: {
        key: '/ns0:Root/ManyToOne/SourceYear',
        name: 'SourceYear',
        schemaNodeDataType: 'None',
        normalizedDataType: 'ComplexType',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
            name: 'SourceMonth',
            schemaNodeDataType: 'None',
            normalizedDataType: 'ComplexType',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                name: 'SourceDay',
                schemaNodeDataType: 'None',
                normalizedDataType: 'ComplexType',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                    name: 'SourceDate',
                    schemaNodeDataType: 'String',
                    normalizedDataType: 'String',
                    properties: 'NotSpecified',
                    fullName: 'SourceDate',
                    parentKey: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                    nodeProperties: ['NotSpecified'],
                    children: [],
                    pathToRoot: [
                      {
                        key: '/ns0:Root',
                        name: 'Root',
                        fullName: 'ns0:Root',
                        repeating: false,
                      },
                      {
                        key: '/ns0:Root/ManyToOne',
                        name: 'ManyToOne',
                        fullName: 'ManyToOne',
                        repeating: false,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear',
                        name: 'SourceYear',
                        fullName: 'SourceYear',
                        repeating: true,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                        name: 'SourceMonth',
                        fullName: 'SourceMonth',
                        repeating: true,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                        name: 'SourceDay',
                        fullName: 'SourceDay',
                        repeating: true,
                      },
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                        name: 'SourceDate',
                        fullName: 'SourceDate',
                        repeating: false,
                      },
                    ],
                  },
                ],
                fullName: 'SourceDay',
                parentKey: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                nodeProperties: ['Repeating'],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    fullName: 'ns0:Root',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/ManyToOne',
                    name: 'ManyToOne',
                    fullName: 'ManyToOne',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear',
                    name: 'SourceYear',
                    fullName: 'SourceYear',
                    repeating: true,
                  },
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                    name: 'SourceMonth',
                    fullName: 'SourceMonth',
                    repeating: true,
                  },
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                    name: 'SourceDay',
                    fullName: 'SourceDay',
                    repeating: true,
                  },
                ],
              },
            ],
            fullName: 'SourceMonth',
            parentKey: '/ns0:Root/ManyToOne/SourceYear',
            nodeProperties: ['Repeating'],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne',
                name: 'ManyToOne',
                fullName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne/SourceYear',
                name: 'SourceYear',
                fullName: 'SourceYear',
                repeating: true,
              },
              {
                key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                name: 'SourceMonth',
                fullName: 'SourceMonth',
                repeating: true,
              },
            ],
          },
        ],
        fullName: 'SourceYear',
        parentKey: '/ns0:Root/ManyToOne',
        nodeProperties: ['Repeating'],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/ManyToOne',
            name: 'ManyToOne',
            fullName: 'ManyToOne',
            repeating: false,
          },
          {
            key: '/ns0:Root/ManyToOne/SourceYear',
            name: 'SourceYear',
            fullName: 'SourceYear',
            repeating: true,
          },
        ],
      },
      reactFlowKey: 'source-/ns0:Root/ManyToOne/SourceYear',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: 'index',
          maxNumberOfInputs: 1,
          type: 'PseudoFunction',
          functionName: '',
          outputValueType: 'Any',
          inputs: [
            {
              name: 'Loop',
              allowedTypes: ['ComplexType'],
              isOptional: false,
              allowCustomInput: false,
              placeHolder: 'The source loop.',
            },
          ],
          displayName: 'Index',
          category: 'Collection',
          description: 'Adds an index value to the loop',
          children: [],
        },
        reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
      },
    ],
  },
  'target-/ns0:Root/ManyToOne/Date': {
    self: {
      node: {
        key: '/ns0:Root/ManyToOne/Date',
        name: 'Date',
        schemaNodeDataType: 'None',
        normalizedDataType: 'ComplexType',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/ManyToOne/Date/DayName',
            name: 'DayName',
            schemaNodeDataType: 'String',
            normalizedDataType: 'String',
            properties: 'NotSpecified',
            children: [],
            fullName: 'DayName',
            parentKey: '/ns0:Root/ManyToOne/Date',
            nodeProperties: ['NotSpecified'],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                fullName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne',
                name: 'ManyToOne',
                fullName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:Root/ManyToOne/Date',
                name: 'Date',
                fullName: 'Date',
                repeating: true,
              },
              {
                key: '/ns0:Root/ManyToOne/Date/DayName',
                name: 'DayName',
                fullName: 'DayName',
                repeating: false,
              },
            ],
          },
        ],
        fullName: 'Date',
        parentKey: '/ns0:Root/ManyToOne',
        nodeProperties: ['Repeating'],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            fullName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/ManyToOne',
            name: 'ManyToOne',
            fullName: 'ManyToOne',
            repeating: false,
          },
          {
            key: '/ns0:Root/ManyToOne/Date',
            name: 'Date',
            fullName: 'Date',
            repeating: true,
          },
        ],
      },
      reactFlowKey: 'target-/ns0:Root/ManyToOne/Date',
    },
    inputs: {
      '0': [
        {
          node: {
            key: 'index',
            maxNumberOfInputs: 1,
            type: 'PseudoFunction',
            functionName: '',
            outputValueType: 'Any',
            inputs: [
              {
                name: 'Loop',
                allowedTypes: ['ComplexType'],
                isOptional: false,
                allowCustomInput: false,
                placeHolder: 'The source loop.',
              },
            ],
            displayName: 'Index',
            category: 'Collection',
            description: 'Adds an index value to the loop',
            children: [],
          },
          reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
        },
      ],
    },
    outputs: [],
  },
} as ConnectionDictionary;
