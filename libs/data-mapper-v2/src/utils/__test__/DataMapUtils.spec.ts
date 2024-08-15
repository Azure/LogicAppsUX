import { FunctionCategory } from '../../models';
import type { FunctionData } from '../../models';
import type { ConnectionDictionary, ConnectionUnit } from '../../models/Connection';
import {
  ReservedToken,
  Separators,
  getDestinationNode,
  getTargetValueWithoutLoops,
  qualifyLoopRelativeSourceKeys,
  splitKeyIntoChildren,
  isValidToMakeMapDefinition,
  amendSourceKeyForDirectAccessIfNeeded,
  addParentConnectionForRepeatingElementsNested,
} from '../DataMap.Utils';
import type { DataMapSchema, Schema, SchemaExtended, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import { comprehensiveSourceSchema, comprehensiveTargetSchema, sourceMockSchema, targetMockSchema } from '../../__mocks__/schemas';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { convertSchemaToSchemaExtended, flattenSchemaIntoDictionary } from '../Schema.Utils';
import { applyConnectionValue } from '../Connection.Utils';

describe('utils/DataMap', () => {
  describe('isValidToMakeMapDefinition', () => {
    it('includes a function node that is not connected to any input and outputs', () => {
      const connectionsWithUnconnectedFunction: ConnectionDictionary = {
        'ToLower-059C6C37-6BA4-4BF0-B100-4BDC798A5AA7': {
          self: {
            node: {
              key: 'ToLower',
              maxNumberOfInputs: 1,
              functionName: 'lower-case',
              outputValueType: NormalizedDataType.String,
              inputs: [
                {
                  name: 'Value',
                  allowedTypes: [NormalizedDataType.String],
                  isOptional: false,
                  allowCustomInput: true,
                  tooltip: 'The value to use',
                  placeHolder: 'The value',
                },
              ],
              displayName: 'To Lower',
              category: FunctionCategory.String,
              description: 'Sets a string to be all lower case',
              tooltip: 'Lower case',
              children: [],
            },
            reactFlowKey: 'ToLower-059C6C37-6BA4-4BF0-B100-4BDC798A5AA7',
          },
          inputs: { '0': [] },
          outputs: [],
        },
      };
      expect(isValidToMakeMapDefinition(connectionsWithUnconnectedFunction)).toBe(true);
    });

    it('includes a function node that is only connected to an input', () => {
      const connectionsWithUnconnectedFunction: ConnectionDictionary = {
        'ToLower-73F91D20-0B8E-4826-A705-76F3E59F1FEB': {
          self: {
            node: {
              key: 'ToLower',
              maxNumberOfInputs: 1,
              functionName: 'lower-case',
              outputValueType: NormalizedDataType.String,
              inputs: [
                {
                  name: 'Value',
                  allowedTypes: [NormalizedDataType.String],
                  isOptional: false,
                  allowCustomInput: true,
                  tooltip: 'The value to use',
                  placeHolder: 'The value',
                },
              ],
              displayName: 'To Lower',
              category: FunctionCategory.String,
              description: 'Sets a string to be all lower case',
              tooltip: 'Lower case',
              children: [],
            },
            reactFlowKey: 'ToLower-73F91D20-0B8E-4826-A705-76F3E59F1FEB',
          },
          inputs: {
            '0': [
              {
                reactFlowKey: 'source-/ns0:SourcePlaygroundRoot/UserID',
                node: {
                  key: '/ns0:SourcePlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  type: NormalizedDataType.String,
                  properties: 'None',
                  parentKey: '/ns0:SourcePlaygroundRoot',
                  nodeProperties: [SchemaNodeProperty.None],
                  children: [],
                  pathToRoot: [
                    {
                      key: '/ns0:SourcePlaygroundRoot',
                      name: 'SourcePlaygroundRoot',
                      qName: 'ns0:SourcePlaygroundRoot',
                      repeating: false,
                    },
                    {
                      key: '/ns0:SourcePlaygroundRoot/UserID',
                      name: 'UserID',
                      qName: 'UserID',
                      repeating: false,
                    },
                  ],
                },
              },
            ],
          },
          outputs: [],
        },
        'source-/ns0:SourcePlaygroundRoot/UserID': {
          self: {
            node: {
              key: '/ns0:SourcePlaygroundRoot/UserID',
              name: 'UserID',
              qName: 'UserID',
              type: NormalizedDataType.String,
              properties: 'None',
              parentKey: '/ns0:SourcePlaygroundRoot',
              nodeProperties: [SchemaNodeProperty.None],
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:SourcePlaygroundRoot',
                  name: 'SourcePlaygroundRoot',
                  qName: 'ns0:SourcePlaygroundRoot',
                  repeating: false,
                },
                {
                  key: '/ns0:SourcePlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  repeating: false,
                },
              ],
            },
            reactFlowKey: 'source-/ns0:SourcePlaygroundRoot/UserID',
          },
          inputs: {
            '0': [],
          },
          outputs: [
            {
              node: {
                key: 'ToLower',
                maxNumberOfInputs: 1,
                functionName: 'lower-case',
                outputValueType: NormalizedDataType.String,
                inputs: [
                  {
                    name: 'Value',
                    allowedTypes: [NormalizedDataType.String],
                    isOptional: false,
                    allowCustomInput: true,
                    tooltip: 'The value to use',
                    placeHolder: 'The value',
                  },
                ],
                displayName: 'To Lower',
                category: FunctionCategory.String,
                description: 'Sets a string to be all lower case',
                tooltip: 'Lower case',
                children: [],
              },
              reactFlowKey: 'ToLower-73F91D20-0B8E-4826-A705-76F3E59F1FEB',
            },
          ],
        },
      };
      expect(isValidToMakeMapDefinition(connectionsWithUnconnectedFunction)).toBe(true);
    });

    it('includes a function node that is only connected to an output', () => {
      const connectionsWithUnconnectedFunction: ConnectionDictionary = {
        'ToLower-1C55C194-8062-446F-B5C6-068DD9C5F06F': {
          self: {
            node: {
              key: 'ToLower',
              maxNumberOfInputs: 1,
              functionName: 'lower-case',
              outputValueType: NormalizedDataType.String,
              inputs: [
                {
                  name: 'Value',
                  allowedTypes: [NormalizedDataType.String],
                  isOptional: false,
                  allowCustomInput: true,
                  tooltip: 'The value to use',
                  placeHolder: 'The value',
                },
              ],
              displayName: 'To Lower',
              category: FunctionCategory.String,
              description: 'Sets a string to be all lower case',
              tooltip: 'Lower case',
              children: [],
            },
            reactFlowKey: 'ToLower-1C55C194-8062-446F-B5C6-068DD9C5F06F',
          },
          inputs: {
            '0': [],
          },
          outputs: [
            {
              node: {
                key: '/ns0:TargetPlaygroundRoot/UserID',
                name: 'UserID',
                qName: 'UserID',
                type: NormalizedDataType.String,
                properties: 'None',
                parentKey: '/ns0:TargetPlaygroundRoot',
                nodeProperties: [SchemaNodeProperty.None],
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:TargetPlaygroundRoot',
                    name: 'TargetPlaygroundRoot',
                    qName: 'ns0:TargetPlaygroundRoot',
                    repeating: false,
                  },
                  {
                    key: '/ns0:TargetPlaygroundRoot/UserID',
                    name: 'UserID',
                    qName: 'UserID',
                    repeating: false,
                  },
                ],
              },
              reactFlowKey: 'target-/ns0:TargetPlaygroundRoot/UserID',
            },
          ],
        },
        'target-/ns0:TargetPlaygroundRoot/UserID': {
          self: {
            node: {
              key: '/ns0:TargetPlaygroundRoot/UserID',
              name: 'UserID',
              qName: 'UserID',
              type: NormalizedDataType.String,
              properties: 'None',
              parentKey: '/ns0:TargetPlaygroundRoot',
              nodeProperties: [SchemaNodeProperty.None],
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:TargetPlaygroundRoot',
                  name: 'TargetPlaygroundRoot',
                  qName: 'ns0:TargetPlaygroundRoot',
                  repeating: false,
                },
                {
                  key: '/ns0:TargetPlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  repeating: false,
                },
              ],
            },
            reactFlowKey: 'target-/ns0:TargetPlaygroundRoot/UserID',
          },
          inputs: {
            '0': [
              {
                reactFlowKey: 'ToLower-1C55C194-8062-446F-B5C6-068DD9C5F06F',
                node: {
                  key: 'ToLower',
                  maxNumberOfInputs: 1,
                  functionName: 'lower-case',
                  outputValueType: NormalizedDataType.String,
                  inputs: [
                    {
                      name: 'Value',
                      allowedTypes: [NormalizedDataType.String],
                      isOptional: false,
                      allowCustomInput: true,
                      tooltip: 'The value to use',
                      placeHolder: 'The value',
                    },
                  ],
                  displayName: 'To Lower',
                  category: FunctionCategory.String,
                  description: 'Sets a string to be all lower case',
                  tooltip: 'Lower case',
                  children: [],
                },
              },
            ],
          },
          outputs: [],
        },
      };

      expect(isValidToMakeMapDefinition(connectionsWithUnconnectedFunction)).toBe(false);
    });

    it('includes a function node that connected to both input and output', () => {
      const connectionsWithUnconnectedFunction: ConnectionDictionary = {
        'ToLower-5CBBDFEE-0809-4D8D-A62D-8D65ABE13738': {
          self: {
            node: {
              key: 'ToLower',
              maxNumberOfInputs: 1,
              functionName: 'lower-case',
              outputValueType: NormalizedDataType.String,
              inputs: [
                {
                  name: 'Value',
                  allowedTypes: [NormalizedDataType.String],
                  isOptional: false,
                  allowCustomInput: true,
                  tooltip: 'The value to use',
                  placeHolder: 'The value',
                },
              ],
              displayName: 'To Lower',
              category: FunctionCategory.String,
              description: 'Sets a string to be all lower case',
              tooltip: 'Lower case',
              children: [],
            },
            reactFlowKey: 'ToLower-5CBBDFEE-0809-4D8D-A62D-8D65ABE13738',
          },
          inputs: {
            '0': [
              {
                reactFlowKey: 'source-/ns0:SourcePlaygroundRoot/UserID',
                node: {
                  key: '/ns0:SourcePlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  type: NormalizedDataType.String,
                  properties: 'None',
                  parentKey: '/ns0:SourcePlaygroundRoot',
                  nodeProperties: [SchemaNodeProperty.None],
                  children: [],
                  pathToRoot: [
                    {
                      key: '/ns0:SourcePlaygroundRoot',
                      name: 'SourcePlaygroundRoot',
                      qName: 'ns0:SourcePlaygroundRoot',
                      repeating: false,
                    },
                    {
                      key: '/ns0:SourcePlaygroundRoot/UserID',
                      name: 'UserID',
                      qName: 'UserID',
                      repeating: false,
                    },
                  ],
                },
              },
            ],
          },
          outputs: [
            {
              node: {
                key: '/ns0:TargetPlaygroundRoot/UserID',
                name: 'UserID',
                qName: 'UserID',
                type: NormalizedDataType.String,
                properties: 'None',
                parentKey: '/ns0:TargetPlaygroundRoot',
                nodeProperties: [SchemaNodeProperty.None],
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:TargetPlaygroundRoot',
                    name: 'TargetPlaygroundRoot',
                    qName: 'ns0:TargetPlaygroundRoot',
                    repeating: false,
                  },
                  {
                    key: '/ns0:TargetPlaygroundRoot/UserID',
                    name: 'UserID',
                    qName: 'UserID',
                    repeating: false,
                  },
                ],
              },
              reactFlowKey: 'target-/ns0:TargetPlaygroundRoot/UserID',
            },
          ],
        },
        'target-/ns0:TargetPlaygroundRoot/UserID': {
          self: {
            node: {
              key: '/ns0:TargetPlaygroundRoot/UserID',
              name: 'UserID',
              qName: 'UserID',
              type: NormalizedDataType.String,
              properties: 'None',
              parentKey: '/ns0:TargetPlaygroundRoot',
              nodeProperties: [SchemaNodeProperty.None],
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:TargetPlaygroundRoot',
                  name: 'TargetPlaygroundRoot',
                  qName: 'ns0:TargetPlaygroundRoot',
                  repeating: false,
                },
                {
                  key: '/ns0:TargetPlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  repeating: false,
                },
              ],
            },
            reactFlowKey: 'target-/ns0:TargetPlaygroundRoot/UserID',
          },
          inputs: {
            '0': [
              {
                reactFlowKey: 'ToLower-5CBBDFEE-0809-4D8D-A62D-8D65ABE13738',
                node: {
                  key: 'ToLower',
                  maxNumberOfInputs: 1,
                  functionName: 'lower-case',
                  outputValueType: NormalizedDataType.String,
                  inputs: [
                    {
                      name: 'Value',
                      allowedTypes: [NormalizedDataType.String],
                      isOptional: false,
                      allowCustomInput: true,
                      tooltip: 'The value to use',
                      placeHolder: 'The value',
                    },
                  ],
                  displayName: 'To Lower',
                  category: FunctionCategory.String,
                  description: 'Sets a string to be all lower case',
                  tooltip: 'Lower case',
                  children: [],
                },
              },
            ],
          },
          outputs: [],
        },
        'source-/ns0:SourcePlaygroundRoot/UserID': {
          self: {
            node: {
              key: '/ns0:SourcePlaygroundRoot/UserID',
              name: 'UserID',
              qName: 'UserID',
              type: NormalizedDataType.String,
              properties: 'None',
              parentKey: '/ns0:SourcePlaygroundRoot',
              nodeProperties: [SchemaNodeProperty.None],
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:SourcePlaygroundRoot',
                  name: 'SourcePlaygroundRoot',
                  qName: 'ns0:SourcePlaygroundRoot',
                  repeating: false,
                },
                {
                  key: '/ns0:SourcePlaygroundRoot/UserID',
                  name: 'UserID',
                  qName: 'UserID',
                  repeating: false,
                },
              ],
            },
            reactFlowKey: 'source-/ns0:SourcePlaygroundRoot/UserID',
          },
          inputs: {
            '0': [],
          },
          outputs: [
            {
              node: {
                key: 'ToLower',
                maxNumberOfInputs: 1,
                functionName: 'lower-case',
                outputValueType: NormalizedDataType.String,
                inputs: [
                  {
                    name: 'Value',
                    allowedTypes: [NormalizedDataType.String],
                    isOptional: false,
                    allowCustomInput: true,
                    tooltip: 'The value to use',
                    placeHolder: 'The value',
                  },
                ],
                displayName: 'To Lower',
                category: FunctionCategory.String,
                description: 'Sets a string to be all lower case',
                tooltip: 'Lower case',
                children: [],
              },
              reactFlowKey: 'ToLower-E9F823A5-4349-47CA-A49E-273CBEF6A86F',
            },
          ],
        },
      };

      expect(isValidToMakeMapDefinition(connectionsWithUnconnectedFunction)).toBe(true);
    });
  });

  describe('addParentConnectionForRepeatingElementsNested', () => {
    it('adds parent connection for repeating elements simple', () => {
      const extendedSource = convertSchemaToSchemaExtended(sourceMockSchema as any as DataMapSchema);
      const extendedTarget = convertSchemaToSchemaExtended(targetMockSchema as any as DataMapSchema);

      const flattenedSource = flattenSchemaIntoDictionary(extendedSource, SchemaType.Source);
      const flattenedTarget = flattenSchemaIntoDictionary(extendedTarget, SchemaType.Target);

      const targetChildNodeId = 'target-/ns0:Root/Looping/Person/Name';
      const sourceChildNodeId = 'source-/ns0:Root/Looping/Employee/TelephoneNumber';

      const sourceChildNode = flattenedSource[sourceChildNodeId];
      const targetChildNode = flattenedTarget[targetChildNodeId];

      const connections: ConnectionDictionary = {};

      applyConnectionValue(connections, {
        targetNode: targetChildNode,
        targetNodeReactFlowKey: targetChildNodeId,
        findInputSlot: true,
        input: {
          reactFlowKey: sourceChildNodeId,
          node: sourceChildNode,
        },
      });

      addParentConnectionForRepeatingElementsNested(sourceChildNode, targetChildNode, flattenedSource, flattenedTarget, connections);

      const targetParentKey = 'target-/ns0:Root/Looping/Person';
      const sourceParentKey = 'source-/ns0:Root/Looping/Employee';

      expect(connections[sourceParentKey].outputs[0].reactFlowKey).toEqual(targetParentKey);
      expect(connections[sourceParentKey].outputs[0].isRepeating).toEqual(true);

      expect((connections[targetParentKey]?.inputs[0]?.[0] as ConnectionUnit).reactFlowKey).toEqual(sourceParentKey);
      expect((connections[targetParentKey]?.inputs[0]?.[0] as ConnectionUnit).isRepeating).toEqual(true);
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

    it('Concat with three values including custom string', async () => {
      expect(splitKeyIntoChildren('concat(EmployeeName, "EmployeeAge", EmployeeID)')).toEqual([
        'EmployeeName',
        '"EmployeeAge"',
        'EmployeeID',
      ]);
    });

    it('Concat with three values surrounded by another function including custom string', async () => {
      expect(splitKeyIntoChildren('int(concat(/ns0:PersonOrigin/FirstName, " ",/ns0:PersonOrigin/LastName))')).toEqual([
        'concat(/ns0:PersonOrigin/FirstName, " ",/ns0:PersonOrigin/LastName)',
      ]);
    });

    it('Concat with three values surrounded by two other functions including custom string in the middle', async () => {
      expect(splitKeyIntoChildren('subtract(2023, int(concat(/ns0:PersonOrigin/FirstName, " ",/ns0:PersonOrigin/LastName)))')).toEqual([
        '2023',
        'int(concat(/ns0:PersonOrigin/FirstName, " ",/ns0:PersonOrigin/LastName))',
      ]);
    });

    it('Concat with three values surrounded by two other functions including custom string in the middle', async () => {
      expect(
        splitKeyIntoChildren('subtract(2023, int(concat("custom string", /ns0:PersonOrigin/FirstName, /ns0:PersonOrigin/LastName)))')
      ).toEqual(['2023', 'int(concat("custom string", /ns0:PersonOrigin/FirstName, /ns0:PersonOrigin/LastName))']);
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
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/Simple/Direct',
          0
        )
      ).toBe('/ns0:TargetSchemaRoot/Looping/ManyToOne/Simple/Direct');
    });

    it('Multiple loops', () => {
      expect(
        getTargetValueWithoutLoops(
          '/ns0:TargetSchemaRoot/Looping/ManyToOne/$for(/ns0:SourceSchemaRoot/Looping/ManyToOne/Simple, $a)/RandomNode/$for(SourceSimpleChild)/$for(SourceSimpleChildChild, $c)/Simple/Direct',
          0
        )
      ).toBe('/ns0:TargetSchemaRoot/Looping/ManyToOne/RandomNode/Simple/Direct');
    });
  });

  describe('amendSourceKeyForDirectAccessIfNeeded', () => {
    it('returns unchanged source key for single quoted string expression with block quotes', () => {
      const result = amendSourceKeyForDirectAccessIfNeeded("'[Y0001]-[M01]-[D01]'");
      expect(result).toEqual(["'[Y0001]-[M01]-[D01]'", '']);
    });

    it('returns unchanged source key for double quoted string expression with block quotes', () => {
      const result = amendSourceKeyForDirectAccessIfNeeded('"[Y0001]-[M01]-[D01]"');
      expect(result).toEqual(['"[Y0001]-[M01]-[D01]"', '']);
    });

    it('returns unchanged source key for expression without direct access', () => {
      const result = amendSourceKeyForDirectAccessIfNeeded('/root/Array/*/Property');
      expect(result).toEqual(['/root/Array/*/Property', '']);
    });

    it('returns unchanged source key for expression with direct access embedded in a function', () => {
      const result = amendSourceKeyForDirectAccessIfNeeded('concat(/root/Array/*[1]/Property, /root/Array/*[1]/Property)');
      expect(result).toEqual(['concat(/root/Array/*[1]/Property, /root/Array/*[1]/Property)', '']);
    });

    it('amends source key for an expression with direct access', () => {
      const result = amendSourceKeyForDirectAccessIfNeeded('/root/Array/*[/root/Array2/*[1]]/Property');
      expect(result).toEqual([
        'directAccess(/root/Array2/*[1], /root/Array/*, /root/Array/*/Property)',
        'directAccess(/root/Array2/*[1], /root/Array/*, /root/Array/*/Property)',
      ]);
    });
  });

  describe('getDestinationNode', () => {
    const mockSchemaNodeExtended: SchemaNodeExtended = {
      key: '/root',
      name: 'root',
      qName: 'root',
      type: NormalizedDataType.String,
      properties: SchemaNodeProperty.None,
      nodeProperties: [SchemaNodeProperty.None],
      children: [
        {
          key: '/root/Some-String-Property-With-A-Dash-And-Longer-Than-A-Guid',
          name: 'Some-String-Property-With-A-Dash-And-Longer-Than-A-Guid',
          qName: 'Some-String-Property-With-A-Dash-And-Longer-Than-A-Guid',
          type: NormalizedDataType.String,
          properties: SchemaNodeProperty.None,
          nodeProperties: [SchemaNodeProperty.None],
          children: [],
          pathToRoot: [],
          arrayItemIndex: undefined,
          parentKey: '/root',
        },
      ],
      pathToRoot: [],
      arrayItemIndex: undefined,
      parentKey: undefined,
    };

    const mockFunctionData: FunctionData = {
      key: 'some-function',
      functionName: 'Some',
      displayName: 'Some',
      category: FunctionCategory.Custom,
      description: 'Some',
      inputs: [],
      maxNumberOfInputs: 0,
      outputValueType: NormalizedDataType.String,
    };

    it('returns function data for function target key', () => {
      const result = getDestinationNode('some-function-4C117648-E570-4CDA-BA8E-DAFC66ECD402', [mockFunctionData], mockSchemaNodeExtended);
      expect(result).toBe(mockFunctionData);
    });

    it('returns schema node for node target key', () => {
      const result = getDestinationNode(
        '/root/Some-String-Property-With-A-Dash-And-Longer-Than-A-Guid',
        [mockFunctionData],
        mockSchemaNodeExtended
      );
      expect(result).toBe(mockSchemaNodeExtended.children[0]);
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
