import type { ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { FunctionCategory } from '../../models/Function';
import {
  createCustomInput,
  createCustomInputConnection,
  createNewEmptyConnection,
  createNodeConnection,
  isNodeConnection,
  isCustomValueConnection,
} from '../Connection.Utils';
import { isFunctionData } from '../Function.Utils';
import { isSchemaNodeExtended } from '../Schema.Utils';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('utils/type-checker-utils', () => {
  const mockSchemaNodeExtended: SchemaNodeExtended = {
    key: '',
    name: '',
    qName: '',
    type: NormalizedDataType.Integer,
    properties: SchemaNodeProperty.None,
    nodeProperties: [SchemaNodeProperty.None],
    children: [],
    pathToRoot: [],
    arrayItemIndex: undefined,
    parentKey: undefined,
  };

  const mockFunctionData: FunctionData = {
    key: 'self',
    functionName: 'Self',
    displayName: 'Self',
    category: FunctionCategory.Math,
    description: 'Self',
    inputs: [],
    maxNumberOfInputs: 0,
    outputValueType: NormalizedDataType.Integer,
  };

  it('isSchemaNodeExtended', () => {
    expect(isSchemaNodeExtended(mockFunctionData)).toEqual(false);
    expect(isSchemaNodeExtended(mockSchemaNodeExtended)).toEqual(true);
  });

  it('isFunctionData', () => {
    expect(isFunctionData(mockSchemaNodeExtended)).toEqual(false);
    expect(isFunctionData(mockFunctionData)).toEqual(true);
  });

  it('isCustomValue', () => {
    expect(isCustomValueConnection({} as InputConnection)).toEqual(false);
    expect(isCustomValueConnection(createCustomInputConnection('custom'))).toEqual(true);
  });

  it('isNodeConnection', () => {
    expect(isNodeConnection(createNewEmptyConnection())).toEqual(false);
    expect(isNodeConnection(createCustomInputConnection('custom'))).toEqual(false);
    expect(isNodeConnection(createNodeConnection({} as SchemaNodeExtended, 'nodeId'))).toEqual(true);
  });
});
