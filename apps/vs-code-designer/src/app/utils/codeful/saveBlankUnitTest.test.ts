/**
 * Unit Tests for:
 * - Improving C# class folder generation.
 * - Standardizing naming conventions for generated files.
 * - Ensuring synchronization between workflow operations and mock outputs.
 */

/**
 * Mock implementation for `fs-extra` to avoid actual file system operations during testing.
 */
vi.mock('fs-extra', () => ({
  writeFile: vi.fn(() => Promise.resolve()), // Mocking writeFile to prevent actual file writes.
  ensureDir: vi.fn(() => Promise.resolve()), // Mocking ensureDir to avoid directory creation.
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildClassDefinition,
  generateClassCode,
  generateCSharpClasses,
  isMockable,
  mapJsonTypeToCSharp,
  parseUnitTestOutputs,
  processAndWriteMockableOperations,
  transformParameters,
} from '../../commands/workflows/unitTest/saveBlankUnitTest';
import type { IAzureConnectorsContext } from '../../commands/workflows/azureConnectorWizard';
import { logTelemetry } from '../unitTests';
import { ext } from '../../../extensionVariables';
import * as fs from 'fs-extra';
import * as path from 'path';

//
// --- transformParameters tests ---
//
describe('transformParameters', () => {
  it('should clean keys and retain only allowed fields', () => {
    const input = {
      'outputs.$.field1': {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'First field',
      },
      'outputs.$.field2': {
        type: 'integer',
        title: 'Field 2',
        extraField: 'ignored',
      },
    };

    const expected = {
      field1: {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'First field',
      },
      field2: { type: 'integer', title: 'Field 2' },
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should build nested structures from dotted keys', () => {
    const input = {
      'outputs.$.parent.child1': { type: 'string', title: 'Child 1' },
      'outputs.$.parent.child2': { type: 'integer', title: 'Child 2', format: 'number' },
    };

    const expected = {
      parent: {
        child1: { type: 'string', title: 'Child 1' },
        child2: { type: 'integer', title: 'Child 2', format: 'number' },
      },
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should skip keys not containing allowed fields', () => {
    const input = {
      'outputs.$.field1': {
        irrelevantField: 'ignored',
        anotherIrrelevantField: 'also ignored',
      },
    };

    const expected = {
      field1: {},
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should handle keys starting with "body.$."', () => {
    const input = {
      'body.$.field1': { type: 'string', title: 'Field 1' },
    };

    const expected = {
      body: {
        field1: { type: 'string', title: 'Field 1' },
      },
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should merge existing keys with additional fields', () => {
    const input = {
      'outputs.$.field1': {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'Updated description',
      },
    };

    const expected = {
      field1: {
        type: 'string',
        title: 'Field 1',
        format: 'text',
        description: 'Updated description',
      },
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should handle an empty input object', () => {
    const input = {};
    const expected = {};
    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should handle deeply nested keys correctly', () => {
    const input = {
      'outputs.$.parent.child1.grandchild1': { type: 'string', title: 'Grandchild 1' },
      'outputs.$.parent.child1.grandchild2': { type: 'integer', title: 'Grandchild 2' },
    };

    const expected = {
      parent: {
        child1: {
          grandchild1: { type: 'string', title: 'Grandchild 1' },
          grandchild2: { type: 'integer', title: 'Grandchild 2' },
        },
      },
    };

    const result = transformParameters(input);
    expect(result).toEqual(expected);
  });

  it('should clean keys and keep only allowed fields', () => {
    const params = {
      'outputs.$.key1': { type: 'string', description: 'Key 1 description', extraField: 'ignored' },
      'body.$.key2': { type: 'integer', title: 'Key 2 title' },
    };
    const transformed = transformParameters(params);
    expect(transformed).toEqual({
      key1: { type: 'string', description: 'Key 1 description' },
      body: {
        key2: { type: 'integer', title: 'Key 2 title' },
      },
    });
  });
});

//
// --- mapJsonTypeToCSharp tests ---
//
describe('mapJsonTypeToCSharp', () => {
  it('should map "string" to "string"', () => {
    const result = mapJsonTypeToCSharp('string');
    expect(result).toBe('string');
  });

  it('should map "integer" to "int"', () => {
    const result = mapJsonTypeToCSharp('integer');
    expect(result).toBe('int');
  });

  it('should map "number" to "double"', () => {
    const result = mapJsonTypeToCSharp('number');
    expect(result).toBe('double');
  });

  it('should map "boolean" to "bool"', () => {
    const result = mapJsonTypeToCSharp('boolean');
    expect(result).toBe('bool');
  });

  it('should map "array" to "List<object>"', () => {
    const result = mapJsonTypeToCSharp('array');
    expect(result).toBe('List<object>');
  });

  it('should map "object" to "JObject"', () => {
    const result = mapJsonTypeToCSharp('object');
    expect(result).toBe('JObject');
  });

  it('should map "any" to "JObject"', () => {
    const result = mapJsonTypeToCSharp('any');
    expect(result).toBe('JObject');
  });

  it('should map "date-time" to "DateTime"', () => {
    const result = mapJsonTypeToCSharp('date-time');
    expect(result).toBe('DateTime');
  });

  it('should map an unknown type to "JObject"', () => {
    const result = mapJsonTypeToCSharp('unknownType');
    expect(result).toBe('JObject');
  });
});

//
// --- parseUnitTestOutputs tests ---
//
describe('parseUnitTestOutputs', () => {
  it('should parse and transform output parameters correctly', async () => {
    const mockUnitTestDefinition = {
      operationInfo: {
        operation1: { type: 'Http' },
        operation2: { type: 'Manual' },
      },
      outputParameters: {
        operation1: {
          outputs: {
            'outputs.$.key1': { type: 'string', description: 'Key 1 description' },
            'outputs.$.key2': { type: 'integer', description: 'Key 2 description' },
          },
        },
        operation2: {
          outputs: {
            'outputs.$.key3': { type: 'boolean', description: 'Key 3 description' },
          },
        },
      },
    };

    const result = await parseUnitTestOutputs(mockUnitTestDefinition);

    expect(result.operationInfo).toEqual(mockUnitTestDefinition.operationInfo);
    expect(result.outputParameters.operation1.outputs).toEqual({
      key1: { type: 'string', description: 'Key 1 description' },
      key2: { type: 'integer', description: 'Key 2 description' },
    });
    expect(result.outputParameters.operation2.outputs).toEqual({
      key3: { type: 'boolean', description: 'Key 3 description' },
    });
  });
});

//
// --- isMockable tests ---
//
describe('isMockable', () => {
  it('should return true for mockable action types', () => {
    expect(isMockable('Http', false)).toBe(true);
    expect(isMockable('ApiManagement', false)).toBe(true);
    expect(isMockable('Manual', true)).toBe(true);
  });

  it('should return false for non-mockable action types', () => {
    expect(isMockable('NonMockableType', false)).toBe(false);
    expect(isMockable('AnotherType', true)).toBe(false);
  });
});

//
// --- buildClassDefinition tests ---
//
describe('buildClassDefinition', () => {
  it('should build a class definition for an object', () => {
    const classDef = buildClassDefinition('RootClass', {
      type: 'object',
      key1: { type: 'string', description: 'Key 1 description' },
      nested: {
        type: 'object',
        nestedKey: { type: 'boolean', description: 'Nested key description' },
      },
    });

    expect(classDef).toEqual({
      className: 'RootClass',
      description: null,
      properties: [
        {
          propertyName: 'Key1',
          propertyType: 'string',
          description: 'Key 1 description',
          isObject: false,
        },
        {
          propertyName: 'Nested',
          propertyType: 'RootClassNested',
          description: null,
          isObject: true,
        },
      ],
      children: [
        {
          className: 'RootClassNested',
          description: null,
          properties: [
            {
              propertyName: 'NestedKey',
              propertyType: 'bool',
              description: 'Nested key description',
              isObject: false,
            },
          ],
          children: [],
        },
      ],
    });
  });
});

//
// --- generateCSharpClasses tests ---
//
describe('generateCSharpClasses', () => {
  it('should generate C# class code from a class definition', () => {
    const classCode = generateCSharpClasses('NamespaceName', 'RootClass', {
      type: 'object',
      key1: { type: 'string', description: 'Key 1 description' },
    });

    expect(classCode).toContain('public class RootClass');
    expect(classCode).toContain('public string Key1 { get; set; }');
  });
});

//
// --- generateClassCode tests ---
//
describe('generateClassCode', () => {
  it('should generate a C# class string for a class definition', () => {
    const classDef = {
      className: 'TestClass',
      description: 'A test class',
      properties: [
        {
          propertyName: 'Property1',
          propertyType: 'string',
          description: 'A string property',
          isObject: false,
        },
        {
          propertyName: 'Property2',
          propertyType: 'int',
          description: 'An integer property',
          isObject: false,
        },
      ],
      children: [],
    };

    const classCode = generateClassCode(classDef);
    expect(classCode).toContain('public class TestClass');
    expect(classCode).toContain('public string Property1 { get; set; }');
    expect(classCode).toContain('public int Property2 { get; set; }');
  });
});

//
// --- logTelemetry tests ---
//
describe('logTelemetry function', () => {
  it('should add properties to context.telemetry.properties', () => {
    const context = {
      telemetry: { properties: {} },
    } as unknown as IAzureConnectorsContext;

    logTelemetry(context, { key1: 'value1', key2: 'value2' });
    expect(context.telemetry.properties).toEqual({
      key1: 'value1',
      key2: 'value2',
    });
  });

  it('should merge properties when called multiple times', () => {
    const context = {
      telemetry: { properties: { key1: 'initialValue' } },
    } as unknown as IAzureConnectorsContext;

    logTelemetry(context, { key2: 'value2' });
    expect(context.telemetry.properties).toEqual({
      key1: 'initialValue',
      key2: 'value2',
    });

    logTelemetry(context, { key1: 'updatedValue', key3: 'value3' });
    expect(context.telemetry.properties).toEqual({
      key1: 'updatedValue',
      key2: 'value2',
      key3: 'value3',
    });
  });
});

//
// --- processAndWriteMockableOperations tests ---
//

// Use a fixture folder for testing instead of a hard-coded fake path.
// In this example, we assume you have a folder named TestFiles in your repository (e.g.,
// apps/vs-code-designer/src/app/utils/codeful/TestFiles) that contains workflow.json.
const projectPath = path.join(__dirname, '../../../TestFiles');
// Since in this fixture projectPath already points to the workflow folder,
// we do not join it with workflowName.
const fakeLogicAppName = 'MyLogicApp';

describe('processAndWriteMockableOperations', () => {
  let writeFileSpy: any;
  let ensureDirSpy: any;

  beforeEach(() => {
    writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockResolvedValue();
    ext.outputChannel = { appendLog: vi.fn() } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a C# file in the "MockOutputs" folder with standardized naming for an action', async () => {
    const operationInfo = {
      ReadAResourceGroup: { type: 'Http', operationId: 'ReadAResourceGroup' },
    };
    const outputParameters = {
      ReadAResourceGroup: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy description' },
        },
      },
    };

    await processAndWriteMockableOperations(operationInfo, outputParameters, projectPath, fakeLogicAppName);

    // The expected "MockOutputs" folder is directly under projectPath.
    const expectedMockOutputsFolder = path.join(projectPath, 'MockOutputs');
    expect(ensureDirSpy).toHaveBeenCalledWith(expectedMockOutputsFolder);

    // The expected file name is based on your code's naming convention.
    // According to the error you saw, the action file is named with "ActionOutput".
    const expectedFileName = 'ReadAResourceGroupActionOutput.cs';
    const expectedFilePath = path.join(expectedMockOutputsFolder, expectedFileName);
    expect(writeFileSpy).toHaveBeenCalledWith(expectedFilePath, expect.any(String), 'utf-8');
  });

  it('should not create duplicate C# classes for identical operations', async () => {
    const operationInfo = {
      ReadAResourceGroup: { type: 'Http', operationId: 'ReadAResourceGroup' },
      ReadAResourceGroupDuplicate: { type: 'Http', operationId: 'ReadAResourceGroup' },
    };
    const outputParameters = {
      ReadAResourceGroup: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy description' },
        },
      },
      ReadAResourceGroupDuplicate: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'duplicate dummy description' },
        },
      },
    };

    await processAndWriteMockableOperations(operationInfo, outputParameters, projectPath, fakeLogicAppName);

    // Expect that writeFile is called only once.
    expect(writeFileSpy.mock.calls.length).toBe(1);
  });

  it('should apply standardized naming conventions for trigger operations', async () => {
    const operationInfo = {
      WhenAHTTPRequestIsReceived: { type: 'HttpWebhook', operationId: 'WhenAHTTPRequestIsReceived' },
    };
    const outputParameters = {
      WhenAHTTPRequestIsReceived: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy trigger description' },
        },
      },
    };

    await processAndWriteMockableOperations(operationInfo, outputParameters, projectPath, fakeLogicAppName);

    const expectedMockOutputsFolder = path.join(projectPath, 'MockOutputs');
    // According to the error, the trigger file is generated with "TriggerOutput" suffix.
    const expectedFileName = 'WhenAHTTPRequestIsReceivedTriggerOutput.cs';
    const expectedFilePath = path.join(expectedMockOutputsFolder, expectedFileName);
    expect(writeFileSpy).toHaveBeenCalledWith(expectedFilePath, expect.any(String), 'utf-8');
  });
});

//
// --- generateCSharpClasses - Naming and Namespace Validation ---
//
describe('generateCSharpClasses - Naming and Namespace Validation', () => {
  it('should generate a C# class with a valid class name and namespace structure', () => {
    const namespaceName = 'MyLogicApp';
    const rootClassName = 'SomeOperationMockOutput';
    const data = {
      type: 'object',
      key: { type: 'string', description: 'test key' },
    };

    const classCode = generateCSharpClasses(namespaceName, rootClassName, data);
    expect(classCode).toContain(`public class ${rootClassName}`);
    expect(classCode).toContain(`namespace ${namespaceName}.Tests.Mocks`);
  });
});
