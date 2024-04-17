import { heavyRepeatingMockSchema } from '../../__mocks__';
import { minFunction } from '../../__mocks__/FunctionMock';
import type { ConnectionDictionary } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import {
  addQuotesToString,
  calculateIndexValue,
  functionInputHasInputs,
  getFunctionLocationsForAllFunctions,
  getFunctionOutputValue,
  removeQuotesFromString,
} from '../Function.Utils';
import { convertSchemaToSchemaExtended } from '../Schema.Utils';
import {
  NormalizedDataType,
  SchemaNodeProperty,
  type Schema,
  type SchemaExtended,
  type SchemaNodeDictionary,
} from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('utils/Functions', () => {
  describe('getFunctionOutputValue', () => {
    const functionName = 'testFunction';
    const inputArgs: string[] = ['arg1', 'arg2', 'arg3'];

    it('Test correct output value without arguments', () => {
      expect(getFunctionOutputValue([], functionName)).toEqual(`${functionName}()`);
    });

    it('Test correct output value with arguments', () => {
      expect(getFunctionOutputValue(inputArgs, functionName)).toEqual(`${functionName}(${inputArgs[0]}, ${inputArgs[1]}, ${inputArgs[2]})`);
    });
  });

  describe('calculateIndexValue', () => {
    const sourceSchema: Schema = heavyRepeatingMockSchema;
    const extendedSourceSchema: SchemaExtended = convertSchemaToSchemaExtended(sourceSchema);

    const parentNodeUnder26 =
      extendedSourceSchema.schemaTreeRoot.children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0];
    const correctParentNodeOver26 =
      extendedSourceSchema.schemaTreeRoot.children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0]
        .children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[0];

    it('Generates loop index value less than 26 children', () => {
      const indexValue = calculateIndexValue(parentNodeUnder26);

      expect(indexValue).toEqual('$x');
    });

    it('Generates loop index value for more than 26 children', () => {
      const indexValue = calculateIndexValue(correctParentNodeOver26);

      expect(indexValue).toEqual('$zb');
    });

    it('Generates same loop index value for more than same level children', () => {
      const indexValueA = calculateIndexValue(correctParentNodeOver26.children[0]);
      const indexValueB = calculateIndexValue(correctParentNodeOver26.children[1]);

      expect(indexValueA).toEqual('$zc');
      expect(indexValueB).toEqual('$zc');
      expect(indexValueA).toEqual(indexValueB);
    });
  });

  describe('functionInputHasInputs', () => {
    const mockReactFlowKey = 'testFunctionInputKey';
    const mockConnections: ConnectionDictionary = {
      [mockReactFlowKey]: {
        self: {
          reactFlowKey: mockReactFlowKey,
          node: {} as FunctionData,
        },
        inputs: {
          0: [],
        },
        outputs: [],
      },
    };

    it('Test function input that does not have inputs', () => {
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(false);
    });

    it('Test function input that has inputs', () => {
      mockConnections[mockReactFlowKey].inputs[0] = ['testInput'];
      expect(functionInputHasInputs(mockReactFlowKey, mockConnections)).toEqual(true);
    });
  });

  describe('getFunctionLocationsForAllFunctions', () => {
    const mockConnections: ConnectionDictionary = {
      'target-/ns0:Root/ConditionalMapping/ItemPrice': {
        self: {
          node: {
            key: '/ns0:Root/ConditionalMapping/ItemPrice',
            name: 'ItemPrice',
            type: NormalizedDataType.Decimal,
            properties: SchemaNodeProperty.None,
            qName: 'ItemPrice',
            parentKey: '/ns0:Root/ConditionalMapping',
            nodeProperties: [SchemaNodeProperty.None],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping',
                name: 'ConditionalMapping',
                qName: 'ConditionalMapping',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping/ItemPrice',
                name: 'ItemPrice',
                qName: 'ItemPrice',
                repeating: false,
              },
            ],
          },
          reactFlowKey: 'target-/ns0:Root/ConditionalMapping/ItemPrice',
        },
        inputs: {
          '0': [
            {
              reactFlowKey: 'Minimum-A17C8DF0-AE6B-43C3-BF37-E75CA2807551',
              node: minFunction,
            },
          ],
        },
        outputs: [],
      },
      'Minimum-A17C8DF0-AE6B-43C3-BF37-E75CA2807551': {
        self: {
          node: minFunction,
          reactFlowKey: 'Minimum-A17C8DF0-AE6B-43C3-BF37-E75CA2807551',
        },
        inputs: {
          '0': [
            {
              reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID',
              node: {
                key: '/ns0:Root/DirectTranslation/EmployeeID',
                name: 'EmployeeID',
                type: NormalizedDataType.Decimal,
                properties: SchemaNodeProperty.None,
                qName: 'EmployeeID',
                parentKey: '/ns0:Root/DirectTranslation',
                nodeProperties: [SchemaNodeProperty.None],
                children: [],
                pathToRoot: [
                  {
                    key: '/ns0:Root',
                    name: 'Root',
                    qName: 'ns0:Root',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/DirectTranslation',
                    name: 'DirectTranslation',
                    qName: 'DirectTranslation',
                    repeating: false,
                  },
                  {
                    key: '/ns0:Root/DirectTranslation/EmployeeID',
                    name: 'EmployeeID',
                    qName: 'EmployeeID',
                    repeating: false,
                  },
                ],
              },
            },
          ],
          '1': [],
        },
        outputs: [
          {
            node: {
              key: '/ns0:Root/ConditionalMapping/ItemPrice',
              name: 'ItemPrice',
              type: NormalizedDataType.Decimal,
              properties: SchemaNodeProperty.None,
              qName: 'ItemPrice',
              parentKey: '/ns0:Root/ConditionalMapping',
              nodeProperties: [SchemaNodeProperty.None],
              children: [],
              pathToRoot: [
                {
                  key: '/ns0:Root',
                  name: 'Root',
                  qName: 'ns0:Root',
                  repeating: false,
                },
                {
                  key: '/ns0:Root/ConditionalMapping',
                  name: 'ConditionalMapping',
                  qName: 'ConditionalMapping',
                  repeating: false,
                },
                {
                  key: '/ns0:Root/ConditionalMapping/ItemPrice',
                  name: 'ItemPrice',
                  qName: 'ItemPrice',
                  repeating: false,
                },
              ],
            },
            reactFlowKey: 'target-/ns0:Root/ConditionalMapping/ItemPrice',
          },
        ],
      },
      'source-/ns0:Root/DirectTranslation/EmployeeID': {
        self: {
          node: {
            key: '/ns0:Root/DirectTranslation/EmployeeID',
            name: 'EmployeeID',
            type: NormalizedDataType.Decimal,
            properties: SchemaNodeProperty.None,
            qName: 'EmployeeID',
            parentKey: '/ns0:Root/DirectTranslation',
            nodeProperties: [SchemaNodeProperty.None],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation',
                name: 'DirectTranslation',
                qName: 'DirectTranslation',
                repeating: false,
              },
              {
                key: '/ns0:Root/DirectTranslation/EmployeeID',
                name: 'EmployeeID',
                qName: 'EmployeeID',
                repeating: false,
              },
            ],
          },
          reactFlowKey: 'source-/ns0:Root/DirectTranslation/EmployeeID',
        },
        inputs: {
          '0': [],
        },
        outputs: [
          {
            node: minFunction,
            reactFlowKey: 'Minimum-A17C8DF0-AE6B-43C3-BF37-E75CA2807551',
          },
        ],
      },
    };

    const mockFlattenedTargetSchema: SchemaNodeDictionary = {
      // this mock contains ItemPrice and its parent, ConditionalMapping
      'target-/ns0:Root/ConditionalMapping/ItemPrice': {
        key: '/ns0:Root/ConditionalMapping/ItemPrice',
        name: 'ItemPrice',
        type: NormalizedDataType.Decimal,
        arrayItemIndex: 0,
        properties: SchemaNodeProperty.None,
        qName: 'ItemPrice',
        parentKey: '/ns0:Root/ConditionalMapping',
        nodeProperties: [SchemaNodeProperty.None],
        children: [],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/ConditionalMapping',
            name: 'ConditionalMapping',
            qName: 'ConditionalMapping',
            repeating: false,
          },
          {
            key: '/ns0:Root/ConditionalMapping/ItemPrice',
            name: 'ItemPrice',
            qName: 'ItemPrice',
            repeating: false,
          },
        ],
      },
      'target-/ns0:Root/ConditionalMapping': {
        key: '/ns0:Root/ConditionalMapping',
        name: 'ConditionalMapping',
        type: NormalizedDataType.Complex,
        properties: SchemaNodeProperty.None,
        children: [
          {
            key: '/ns0:Root/ConditionalMapping/ItemPrice',
            name: 'ItemPrice',
            type: NormalizedDataType.Decimal,
            properties: SchemaNodeProperty.None,
            qName: 'ItemPrice',
            parentKey: '/ns0:Root/ConditionalMapping',
            nodeProperties: [SchemaNodeProperty.None],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping',
                name: 'ConditionalMapping',
                qName: 'ConditionalMapping',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping/ItemPrice',
                name: 'ItemPrice',
                qName: 'ItemPrice',
                repeating: false,
              },
            ],
          },
          {
            key: '/ns0:Root/ConditionalMapping/ItemQuantity',
            name: 'ItemQuantity',
            type: NormalizedDataType.Decimal,
            properties: SchemaNodeProperty.None,
            qName: 'ItemQuantity',
            parentKey: '/ns0:Root/ConditionalMapping',
            nodeProperties: [SchemaNodeProperty.None],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping',
                name: 'ConditionalMapping',
                qName: 'ConditionalMapping',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping/ItemQuantity',
                name: 'ItemQuantity',
                qName: 'ItemQuantity',
                repeating: false,
              },
            ],
          },
          {
            key: '/ns0:Root/ConditionalMapping/ItemDiscount',
            name: 'ItemDiscount',
            type: NormalizedDataType.Decimal,
            properties: 'Optional',
            qName: 'ItemDiscount',
            parentKey: '/ns0:Root/ConditionalMapping',
            nodeProperties: [],
            children: [],
            pathToRoot: [
              {
                key: '/ns0:Root',
                name: 'Root',
                qName: 'ns0:Root',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping',
                name: 'ConditionalMapping',
                qName: 'ConditionalMapping',
                repeating: false,
              },
              {
                key: '/ns0:Root/ConditionalMapping/ItemDiscount',
                name: 'ItemDiscount',
                qName: 'ItemDiscount',
                repeating: false,
              },
            ],
          },
        ],
        qName: 'ConditionalMapping',
        parentKey: '/ns0:Root',
        nodeProperties: [SchemaNodeProperty.None],
        pathToRoot: [
          {
            key: '/ns0:Root',
            name: 'Root',
            qName: 'ns0:Root',
            repeating: false,
          },
          {
            key: '/ns0:Root/ConditionalMapping',
            name: 'ConditionalMapping',
            qName: 'ConditionalMapping',
            repeating: false,
          },
        ],
      },
    };
    it('adds connected target node and parent to functionLocations', () => {
      const functions = getFunctionLocationsForAllFunctions(mockConnections, mockFlattenedTargetSchema);
      const locationsForFunction = functions['Minimum-A17C8DF0-AE6B-43C3-BF37-E75CA2807551'].functionLocations;
      expect(
        locationsForFunction.every((node) => {
          return node.key === 'target-/ns0:Root/ConditionalMapping/ItemPrice' || node.key === 'target-/ns0:Root/ConditionalMapping';
        }) && locationsForFunction.length === 2
      );
    });
  });

  describe('addQuotesToString', () => {
    it('adds quotes to string with none', () => {
      const noQuotesString = 'str';
      const quotesString = addQuotesToString(noQuotesString);
      expect(quotesString).toEqual('"str"');
    });

    it("doesn't add quotes to string with quotation marks", () => {
      const quotesString = '"str"';
      const modifiedQuotesString = addQuotesToString(quotesString);
      expect(modifiedQuotesString).toEqual('"str"');
    });
  });

  describe('removeQuotesFromString', () => {
    it("returns same string if it doesn't have quotes", () => {
      const noQuotesString = 'str';
      const quotesString = removeQuotesFromString(noQuotesString);
      expect(quotesString).toEqual('str');
    });

    it('removes quotes from string', () => {
      const quotesString = '"str"';
      const noQuotesString = removeQuotesFromString(quotesString);
      expect(noQuotesString).toEqual('str');
    });
  });
});
