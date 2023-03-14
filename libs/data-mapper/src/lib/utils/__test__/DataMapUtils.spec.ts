import type { Schema, SchemaExtended, SchemaNodeExtended } from '../../models';
import { FunctionCategory, NormalizedDataType, SchemaNodeProperty, SchemaType } from '../../models';
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
import { comprehensiveSourceSchema, comprehensiveTargetSchema, sourceMockSchema } from '__mocks__/schemas';

describe('utils/DataMap', () => {
  describe('addAncestorNodesToCanvas', () => {
    const sourceSchema: Schema = comprehensiveSourceSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);
    const flattenedSchema = flattenSchemaIntoDictionary(extendedSourceSchema, SchemaType.Source);

    it('includes direct parent', () => {
      const nodeToAddKey = addSourceReactFlowPrefix(
        '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
      );

      const nodesCurrentlyOnCanvas: SchemaNodeExtended[] = [];
      const nodeToAdd = flattenedSchema[nodeToAddKey];
      const newNodesOnCanvas = [...nodesCurrentlyOnCanvas, nodeToAdd];
      addAncestorNodesToCanvas(nodeToAdd, nodesCurrentlyOnCanvas, flattenedSchema, newNodesOnCanvas);

      const parentOnCanvasKey = addSourceReactFlowPrefix(
        '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild'
      );
      expect(newNodesOnCanvas).toContain(flattenedSchema[parentOnCanvasKey]);
    });

    it('includes all nodes under highest ancestor on the canvas', () => {
      const nodeToAddKey = addSourceReactFlowPrefix(
        '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
      );
      const ancestorOnCanvasKey = addSourceReactFlowPrefix('/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple');
      const nodesCurrentlyOnCanvas = [flattenedSchema[ancestorOnCanvasKey]];
      const nodeToAdd = flattenedSchema[nodeToAddKey];
      const newNodesOnCanvas = [...nodesCurrentlyOnCanvas, nodeToAdd];

      addAncestorNodesToCanvas(nodeToAdd, nodesCurrentlyOnCanvas, flattenedSchema, newNodesOnCanvas);
      const interimAncestorKey1 = addSourceReactFlowPrefix(
        '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild'
      );
      const interimAncestorKey2 = addSourceReactFlowPrefix(
        '/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect'
      );
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
      const extendedSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
      const flattenedSchema = flattenSchemaIntoDictionary(extendedSource, SchemaType.Source);

      const result = getSourceValueFromLoop(
        'SourceDirect',
        '/ns0:TargetSchemaRoot/Looping/ManyToMany/$for(/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple)/Simple/$for(SourceSimpleChild)/SimpleChild/$for(SourceSimpleChildChild)/SimpleChildChild',
        flattenedSchema
      );
      expect(result).toEqual('/ns0:SourceSchemaRoot/Looping/ManyToMany/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect');
    });
  });

  describe('addParentConnectionForRepeatingElementsNested', () => {
    const extendedLoopSource = convertSchemaToSchemaExtended(comprehensiveSourceSchema);
    const extendedLoopTarget = convertSchemaToSchemaExtended(comprehensiveTargetSchema);
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
      const parentTarget = connectionsDict['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'];
      const input0 = parentTarget.inputs['0'][0] as ConnectionUnit;
      const input1 = parentTarget.inputs['0'][1] as ConnectionUnit;
      const input2 = parentTarget.inputs['0'][2] as ConnectionUnit;

      expect(input0.reactFlowKey).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild');
      expect(input1.reactFlowKey).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild');
      expect(input2.reactFlowKey).toEqual('source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple');
    });

    it('adds parent connections for indexed many-to-one', () => {
      const sourceNodeParent = flattenedLoopSource['source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple'];
      const targetNodeParent = flattenedLoopTarget['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'];

      addParentConnectionForRepeatingElementsNested(sourceNodeParent, targetNodeParent, flattenedLoopSource, flattenedLoopTarget, indexed);
      const parentTarget = indexed['target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple'];
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
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/$for(SourceSimpleChild)/$for(SourceSimpleChildChild, $c)/Simple/Direct'
        )
      ).toBe(
        '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild, $c)/Simple/Direct'
      );
    });

    it('Nested loops with already-qualified/absolute source keys', () => {
      expect(
        qualifyLoopRelativeSourceKeys(
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild, $b)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild, $c)/Simple/Direct'
        )
      ).toBe(
        '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild, $b)/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild, $c)/Simple/Direct'
      );
    });

    it('Single loop (fully-qualified/absolute)', () => {
      expect(
        qualifyLoopRelativeSourceKeys(
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/RandomKey'
        )
      ).toBe('/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/RandomKey');
    });
  });

  describe('getTargetValueWithoutLoops', () => {
    it('Single loop', () => {
      expect(
        getTargetValueWithoutLoops(
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/Simple/Direct'
        )
      ).toBe('/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct');
    });

    it('Multiple loops', () => {
      expect(
        getTargetValueWithoutLoops(
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/RandomNode/$for(SourceSimpleChild)/$for(SourceSimpleChildChild, $c)/Simple/Direct'
        )
      ).toBe('/ns0:TargetSchemaRoot/Looping/ManyToOne/RandomNode/Simple/Direct');
    });
  });
});

const indexed: ConnectionDictionary = {
  'index-6034001E-DCD3-468D-B7B9-84A2E154DE62': {
    self: {
      node: {
        key: 'index',
        maxNumberOfInputs: 1,
        functionName: '',
        outputValueType: NormalizedDataType.Any,
        inputs: [
          {
            name: 'Loop',
            allowedTypes: [NormalizedDataType.Complex],
            isOptional: false,
            allowCustomInput: false,
            placeHolder: 'The source loop.',
          },
        ],
        displayName: 'Index',
        category: FunctionCategory.Collection,
        description: 'Adds an index value to the loop',
        children: [],
      },
      reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
    },
    inputs: {
      '0': [
        {
          node: {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
            name: 'Simple',
            type: NormalizedDataType.Complex,
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                name: 'SourceSimpleChild',
                type: NormalizedDataType.Complex,
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                    name: 'SourceSimpleChildChild',
                    type: NormalizedDataType.Complex,
                    properties: 'Repeating',
                    children: [
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                        name: 'SourceDirect',
                        type: NormalizedDataType.String,
                        properties: 'None',
                        qName: 'SourceDirect',
                        parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                        nodeProperties: [SchemaNodeProperty.None],
                        children: [],
                        pathToRoot: [
                          {
                            key: '/ns0:SourceSchemaRoot',
                            name: 'SourceSchemaRoot',
                            qName: 'ns0:SourceSchemaRoot',
                            repeating: false,
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                            name: 'ManyToOne',
                            qName: 'ManyToOne',
                            repeating: false,
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                            name: 'Simple',
                            qName: 'Simple',
                            repeating: true,
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                            name: 'SourceSimpleChild',
                            qName: 'SourceSimpleChild',
                            repeating: true,
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                            name: 'SourceSimpleChildChild',
                            qName: 'SourceSimpleChildChild',
                            repeating: true,
                          },
                          {
                            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                            name: 'SourceDirect',
                            qName: 'SourceDirect',
                            repeating: false,
                          },
                        ],
                        arrayItemIndex: undefined,
                      },
                    ],
                    qName: 'SourceSimpleChildChild',
                    parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                    nodeProperties: [SchemaNodeProperty.Repeating],
                    pathToRoot: [
                      {
                        key: '/ns0:SourceSchemaRoot',
                        name: 'SourceSchemaRoot',
                        qName: 'ns0:SourceSchemaRoot',
                        repeating: false,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                        name: 'ManyToOne',
                        qName: 'ManyToOne',
                        repeating: false,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                        name: 'Simple',
                        qName: 'Simple',
                        repeating: true,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                        name: 'SourceSimpleChild',
                        qName: 'SourceSimpleChild',
                        repeating: true,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                        name: 'SourceSimpleChildChild',
                        qName: 'SourceSimpleChildChild',
                        repeating: true,
                      },
                    ],
                    arrayItemIndex: undefined,
                  },
                ],
                qName: 'SourceSimpleChild',
                parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                nodeProperties: [SchemaNodeProperty.Repeating],
                pathToRoot: [
                  {
                    key: '/ns0:SourceSchemaRoot',
                    name: 'SourceSchemaRoot',
                    qName: 'ns0:SourceSchemaRoot',
                    repeating: false,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                    name: 'ManyToOne',
                    qName: 'ManyToOne',
                    repeating: false,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                    name: 'Simple',
                    qName: 'Simple',
                    repeating: true,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                    name: 'SourceSimpleChild',
                    qName: 'SourceSimpleChild',
                    repeating: true,
                  },
                ],
                arrayItemIndex: undefined,
              },
            ],
            qName: 'Simple',
            parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
            nodeProperties: [SchemaNodeProperty.Repeating],
            pathToRoot: [
              {
                key: '/ns0:SourceSchemaRoot',
                name: 'SourceSchemaRoot',
                qName: 'ns0:SourceSchemaRoot',
                repeating: false,
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                name: 'ManyToOne',
                qName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                name: 'Simple',
                qName: 'Simple',
                repeating: true,
              },
            ],
            arrayItemIndex: undefined,
          },
          reactFlowKey: 'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
        },
      ],
    },
    outputs: [
      {
        node: {
          key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
          name: 'Date',
          type: NormalizedDataType.Complex,
          properties: 'Repeating',
          children: [
            {
              key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
              name: 'Direct',
              type: NormalizedDataType.String,
              properties: 'None',
              children: [],
              qName: 'Direct',
              parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
              nodeProperties: [SchemaNodeProperty.None],
              pathToRoot: [
                {
                  key: '/ns0:TargetSchemaRoot',
                  name: 'TargetSchemaRoot',
                  qName: 'ns0:TargetSchemaRoot',
                  repeating: false,
                },
                {
                  key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
                  name: 'ManyToOne',
                  qName: 'ManyToOne',
                  repeating: false,
                },
                {
                  key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
                  name: 'Simple',
                  qName: 'Simple',
                  repeating: true,
                },
                {
                  key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
                  name: 'Direct',
                  qName: 'Direct',
                  repeating: false,
                },
              ],
              arrayItemIndex: undefined,
            },
          ],
          qName: 'Simple',
          parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
          nodeProperties: [SchemaNodeProperty.Repeating],
          pathToRoot: [
            {
              key: '/ns0:TargetSchemaRoot',
              name: 'TargetSchemaRoot',
              qName: 'ns0:TargetSchemaRoot',
              repeating: false,
            },
            {
              key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
              name: 'ManyToOne',
              qName: 'ManyToOne',
              repeating: false,
            },
            {
              key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
              name: 'Date',
              qName: 'Date',
              repeating: true,
            },
          ],
          arrayItemIndex: undefined,
        },
        reactFlowKey: 'target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
      },
    ],
  },
  'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple': {
    self: {
      node: {
        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
        name: 'Simple',
        type: NormalizedDataType.Complex,
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
            name: 'SourceSimpleChild',
            type: NormalizedDataType.Complex,
            properties: 'Repeating',
            children: [
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                name: 'SourceSimpleChildChild',
                type: NormalizedDataType.Complex,
                properties: 'Repeating',
                children: [
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                    name: 'SourceDirect',
                    type: NormalizedDataType.String,
                    properties: 'None',
                    qName: 'SourceDirect',
                    parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                    nodeProperties: [SchemaNodeProperty.None],
                    children: [],
                    pathToRoot: [
                      {
                        key: '/ns0:SourceSchemaRoot',
                        name: 'SourceSchemaRoot',
                        qName: 'ns0:SourceSchemaRoot',
                        repeating: false,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                        name: 'ManyToOne',
                        qName: 'ManyToOne',
                        repeating: false,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                        name: 'Simple',
                        qName: 'Simple',
                        repeating: true,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                        name: 'SourceSimpleChild',
                        qName: 'SourceSimpleChild',
                        repeating: true,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                        name: 'SourceSimpleChildChild',
                        qName: 'SourceSimpleChildChild',
                        repeating: true,
                      },
                      {
                        key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild/SourceDirect',
                        name: 'SourceDirect',
                        qName: 'SourceDirect',
                        repeating: false,
                      },
                    ],
                    arrayItemIndex: undefined,
                  },
                ],
                qName: 'SourceSimpleChildChild',
                parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                nodeProperties: [SchemaNodeProperty.Repeating],
                pathToRoot: [
                  {
                    key: '/ns0:SourceSchemaRoot',
                    name: 'SourceSchemaRoot',
                    qName: 'ns0:SourceSchemaRoot',
                    repeating: false,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                    name: 'ManyToOne',
                    qName: 'ManyToOne',
                    repeating: false,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                    name: 'Simple',
                    qName: 'Simple',
                    repeating: true,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                    name: 'SourceSimpleChild',
                    qName: 'SourceSimpleChild',
                    repeating: true,
                  },
                  {
                    key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild',
                    name: 'SourceSimpleChildChild',
                    qName: 'SourceSimpleChildChild',
                    repeating: true,
                  },
                ],
                arrayItemIndex: undefined,
              },
            ],
            qName: 'SourceSimpleChild',
            parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
            nodeProperties: [SchemaNodeProperty.Repeating],
            pathToRoot: [
              {
                key: '/ns0:SourceSchemaRoot',
                name: 'SourceSchemaRoot',
                qName: 'ns0:SourceSchemaRoot',
                repeating: false,
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
                name: 'ManyToOne',
                qName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
                name: 'Simple',
                qName: 'Simple',
                repeating: true,
              },
              {
                key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild',
                name: 'SourceSimpleChild',
                qName: 'SourceSimpleChild',
                repeating: true,
              },
            ],
            arrayItemIndex: undefined,
          },
        ],
        qName: 'Simple',
        parentKey: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
        nodeProperties: [SchemaNodeProperty.Repeating],
        pathToRoot: [
          {
            key: '/ns0:SourceSchemaRoot',
            name: 'SourceSchemaRoot',
            qName: 'ns0:SourceSchemaRoot',
            repeating: false,
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne',
            name: 'ManyToOne',
            qName: 'ManyToOne',
            repeating: false,
          },
          {
            key: '/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
            name: 'Simple',
            qName: 'Simple',
            repeating: true,
          },
        ],
        arrayItemIndex: undefined,
      },
      reactFlowKey: 'source-/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple',
    },
    inputs: {
      '0': [],
    },
    outputs: [
      {
        node: {
          key: 'index',
          maxNumberOfInputs: 1,
          functionName: '',
          outputValueType: NormalizedDataType.Any,
          inputs: [
            {
              name: 'Loop',
              allowedTypes: [NormalizedDataType.Complex],
              isOptional: false,
              allowCustomInput: false,
              placeHolder: 'The source loop.',
            },
          ],
          displayName: 'Index',
          category: FunctionCategory.Collection,
          description: 'Adds an index value to the loop',
          children: [],
        },
        reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
      },
    ],
  },
  'target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple': {
    self: {
      node: {
        key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
        name: 'Date',
        type: NormalizedDataType.Complex,
        properties: 'Repeating',
        children: [
          {
            key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
            name: 'Direct',
            type: NormalizedDataType.String,
            properties: 'None',
            children: [],
            qName: 'Direct',
            parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
            nodeProperties: [SchemaNodeProperty.None],
            pathToRoot: [
              {
                key: '/ns0:TargetSchemaRoot',
                name: 'TargetSchemaRoot',
                qName: 'ns0:TargetSchemaRoot',
                repeating: false,
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
                name: 'ManyToOne',
                qName: 'ManyToOne',
                repeating: false,
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
                name: 'Date',
                qName: 'Date',
                repeating: true,
              },
              {
                key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct',
                name: 'Direct',
                qName: 'Direct',
                repeating: false,
              },
            ],
            arrayItemIndex: undefined,
          },
        ],
        qName: 'Simple',
        parentKey: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
        nodeProperties: [SchemaNodeProperty.Repeating],
        pathToRoot: [
          {
            key: '/ns0:TargetSchemaRoot',
            name: 'TargetSchemaRoot',
            qName: 'ns0:TargetSchemaRoot',
            repeating: false,
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/ManyToOne',
            name: 'ManyToOne',
            qName: 'ManyToOne',
            repeating: false,
          },
          {
            key: '/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
            name: 'Simple',
            qName: 'Simple',
            repeating: true,
          },
        ],
        arrayItemIndex: undefined,
      },
      reactFlowKey: 'target-/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple',
    },
    inputs: {
      '0': [
        {
          node: {
            key: 'index',
            maxNumberOfInputs: 1,
            functionName: '',
            outputValueType: NormalizedDataType.Any,
            inputs: [
              {
                name: 'Loop',
                allowedTypes: [NormalizedDataType.Complex],
                isOptional: false,
                allowCustomInput: false,
                placeHolder: 'The source loop.',
              },
            ],
            displayName: 'Index',
            category: FunctionCategory.Collection,
            description: 'Adds an index value to the loop',
            children: [],
          },
          reactFlowKey: 'index-6034001E-DCD3-468D-B7B9-84A2E154DE62',
        },
      ],
    },
    outputs: [],
  },
};
