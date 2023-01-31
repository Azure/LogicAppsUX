import { layeredLoopSourceMockSchema, layeredLoopTargetMockSchema, simpleLoopSource, sourceMockSchema } from '../../__mocks__';
import type { Schema, SchemaExtended, SchemaNodeExtended } from '../../models';
import { SchemaType } from '../../models';
import type { ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import {
  addAncestorNodesToCanvas,
  addParentConnectionForRepeatingElementsNested,
  getSourceValueFromLoop,
  getTargetValueWithoutLoops,
  qualifyLoopRelativeSourceKeys,
  splitKeyIntoChildren,
} from '../DataMap.Utils';
import { addSourceReactFlowPrefix } from '../ReactFlow.Util';
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
  describe('addAncestorNodesToCanvas', () => {
    const sourceSchema: Schema = layeredLoopSourceMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);
    const flattenedSchema = flattenSchemaIntoDictionary(extendedSourceSchema, SchemaType.Source);

    it('includes direct parent', () => {
      const nodeToAddKey = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear/SourceMonth/SourceDay/SourceDate');

      const nodesCurrentlyOnCanvas: SchemaNodeExtended[] = [];
      const nodeToAdd = flattenedSchema[nodeToAddKey];
      const newNodesOnCanvas = [...nodesCurrentlyOnCanvas, nodeToAdd];
      addAncestorNodesToCanvas(nodeToAdd, nodesCurrentlyOnCanvas, flattenedSchema, newNodesOnCanvas);

      const parentOnCanvasKey = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear/SourceMonth/SourceDay');
      expect(newNodesOnCanvas).toContain(flattenedSchema[parentOnCanvasKey]);
    });

    it('includes all nodes under highest ancestor on the canvas', () => {
      const nodeToAddKey = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear/SourceMonth/SourceDay/SourceDate');
      const ancestorOnCanvasKey = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear');
      const nodesCurrentlyOnCanvas = [flattenedSchema[ancestorOnCanvasKey]];
      const nodeToAdd = flattenedSchema[nodeToAddKey];
      const newNodesOnCanvas = [...nodesCurrentlyOnCanvas, nodeToAdd];

      addAncestorNodesToCanvas(nodeToAdd, nodesCurrentlyOnCanvas, flattenedSchema, newNodesOnCanvas);
      const interimAncestorKey1 = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear/SourceMonth/SourceDay');
      const interimAncestorKey2 = addSourceReactFlowPrefix('/ns0:Root/ManyToMany/SourceYear/SourceMonth/SourceDay/SourceDate');
      expect(newNodesOnCanvas).toContain(flattenedSchema[interimAncestorKey1]);
      expect(newNodesOnCanvas).toContain(flattenedSchema[interimAncestorKey2]);
    });
  });
  describe('getSourceValueFromLoop', () => {
    it('gets the source key from a looped target string', () => {
      const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
      const flattenedSchema = flattenSchemaIntoDictionary(extendedSource, SchemaType.Source);

      const result = getSourceValueFromLoop(
        'TelephoneNumber',
        '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name',
        flattenedSchema
      );
      expect(result).toEqual('/ns0:Root/Looping/Employee/TelephoneNumber');
    });

    it('gets the source key from a looped target string with a function', () => {
      const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema);
      const flattenedSchema = flattenSchemaIntoDictionary(extendedSource, SchemaType.Source);

      const result = getSourceValueFromLoop(
        'lower-case(TelephoneNumber)',
        '/ns0:Root/Looping/$for(/ns0:Root/Looping/Employee)/Person/Name',
        flattenedSchema
      );
      expect(result).toEqual('lower-case(/ns0:Root/Looping/Employee/TelephoneNumber)');
    });

    it('gets the source key from a nested looped target string', () => {
      const extendedSource = convertSchemaToSchemaExtended(simpleLoopSource);
      const flattenedSchema = flattenSchemaIntoDictionary(extendedSource, SchemaType.Source);

      const result = getSourceValueFromLoop(
        'Day',
        '/ns0:Root/Ano/$for(/ns0:Root/Year)/Mes/$for(/ns0:Root/Year/Month)/Dia',
        flattenedSchema
      );
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

  describe('splitKeyIntoChildren', () => {
    it('No nested functions', async () => {
      expect(splitKeyIntoChildren('to-lower(EmployeeName)')).toEqual(['EmployeeName']);
    });

    it('Multiple node ids', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, EmployeeID)')).toEqual(['EmployeeName', 'EmployeeID']);
    });

    it('Content enricher', async () => {
      expect(splitKeyIntoChildren('get-date()')).toEqual([]);
    });

    it('Mixed node and function', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, string(EmployeeID))')).toEqual(['EmployeeName', 'string(EmployeeID)']);
    });

    it('Multiple functions', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        'string(EmployeeID)',
      ]);
    });

    it('Single constant', async () => {
      expect(splitKeyIntoChildren('to-lower("UpperCase")')).toEqual([`"UpperCase"`]);
    });

    it('Constants with parenthesis', async () => {
      expect(splitKeyIntoChildren('to-lower("(UpperCase)")')).toEqual([`"(UpperCase)"`]);
    });

    it('Constants with half parenthesis', async () => {
      expect(splitKeyIntoChildren('concat(to-lower("(SingleLeft"), "(2ndSingleLeft")')).toEqual([
        `to-lower("(SingleLeft")`,
        `"(2ndSingleLeft"`,
      ]);
    });

    it('Complex', async () => {
      expect(splitKeyIntoChildren('concat(to-lower(EmployeeName), "Start Date: ", get-date(), string(EmployeeID))')).toEqual([
        'to-lower(EmployeeName)',
        `"Start Date: "`,
        'get-date()',
        'string(EmployeeID)',
      ]);
    });
  });

  describe('qualifyLoopRelativeSourceKeys', () => {
    it('Nested loops with relative source keys', () => {
      expect(
        qualifyLoopRelativeSourceKeys(
          '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/$for(SourceMonth)/$for(SourceDay, $c)/Date/DayName'
        )
      ).toBe(
        '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay, $c)/Date/DayName'
      );
    });

    it('Nested loops with already-qualified/absolute source keys', () => {
      expect(
        qualifyLoopRelativeSourceKeys(
          '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth, $b)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay, $c)/Date/DayName'
        )
      ).toBe(
        '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth, $b)/$for(/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay, $c)/Date/DayName'
      );
    });

    it('Single loop (fully-qualified/absolute)', () => {
      expect(qualifyLoopRelativeSourceKeys('/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/RandomKey')).toBe(
        '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/RandomKey'
      );
    });
  });

  describe('getTargetValueWithoutLoops', () => {
    it('Single loop', () => {
      expect(getTargetValueWithoutLoops('/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/Date/DayName')).toBe(
        '/ns0:Root/ManyToOne/Date/DayName'
      );
    });

    it('Multiple loops', () => {
      expect(
        getTargetValueWithoutLoops(
          '/ns0:Root/ManyToOne/$for(/ns0:Root/ManyToOne/SourceYear, $a)/RandomNode/$for(SourceMonth)/$for(SourceDay, $c)/Date/DayName'
        )
      ).toBe('/ns0:Root/ManyToOne/RandomNode/Date/DayName');
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
            normalizedDataType: 'ComplexType',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
                name: 'SourceMonth',
                normalizedDataType: 'ComplexType',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                    name: 'SourceDay',
                    normalizedDataType: 'ComplexType',
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                        name: 'SourceDate',
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
          normalizedDataType: 'ComplexType',
          properties: 'Repeating',
          children: [
            {
              key: '/ns0:Root/ManyToOne/Date/DayName',
              name: 'DayName',
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
        normalizedDataType: 'ComplexType',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth',
            name: 'SourceMonth',
            normalizedDataType: 'ComplexType',
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay',
                name: 'SourceDay',
                normalizedDataType: 'ComplexType',
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:Root/ManyToOne/SourceYear/SourceMonth/SourceDay/SourceDate',
                    name: 'SourceDate',
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
        normalizedDataType: 'ComplexType',
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:Root/ManyToOne/Date/DayName',
            name: 'DayName',
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
