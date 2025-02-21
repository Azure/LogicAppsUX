import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as fs from 'fs-extra';
import path from 'path';
import * as localizeModule from '../../../../localize';
import { ext } from '../../../../extensionVariables';
import type { IAzureConnectorsContext } from '../../../commands/workflows/azureConnectorWizard';
import {
  extractAndValidateRunId,
  validateRunId,
  removeInvalidCharacters,
  parseErrorBeforeTelemetry,
  generateCSharpClasses,
  generateClassCode,
  logTelemetry,
  processAndWriteMockableOperations,
  buildClassDefinition,
  mapJsonTypeToCSharp,
} from '../../unitTests';

// ============================================================================
// Global Constants and Test Hooks
// ============================================================================

// Use TextEncoder for encoding/decoding JSON responses
const encoder = new TextEncoder();

// Fixture path for tests that require a project folder
const projectPath = path.join(__dirname, '../../../__mocks__');
// Fake logic app name for tests that need one
const fakeLogicAppName = 'MyLogicApp';

// Global beforeEach hook to set up common values
beforeEach(() => {
  ext.designTimePort = 1234; // ensure designTimePort is defined for tests
  ext.outputChannel = { appendLog: vi.fn() } as any;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Test Suites
// ============================================================================

describe('extractAndValidateRunId', () => {
  it('should throw an error if runId is undefined', async () => {
    await expect(extractAndValidateRunId(undefined)).rejects.toThrowError('Run ID is required to generate a codeful unit test.');
  });

  it('should extract and validate a valid runId from a path', async () => {
    const runId = '/workflows/testWorkflow/runs/ABC123';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });

  it('should validate a direct valid runId', async () => {
    const runId = 'ABC123';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });

  it('should throw an error for an invalid runId format', async () => {
    const runId = '/workflows/testWorkflow/runs/invalid-run-id';
    await expect(extractAndValidateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });

  it('should trim whitespace around the runId', async () => {
    const runId = '   ABC123   ';
    const result = await extractAndValidateRunId(runId);
    expect(result).toBe('ABC123');
  });
});

describe('validateRunId', () => {
  it('should resolve for a valid runId', async () => {
    const runId = 'ABC123';
    await expect(validateRunId(runId)).resolves.not.toThrow();
  });

  it('should throw an error for an invalid runId', async () => {
    const runId = 'abc123';
    await expect(validateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });

  it('should throw an error for an empty runId', async () => {
    const runId = '';
    await expect(validateRunId(runId)).rejects.toThrowError('Invalid runId format.');
  });
});

describe('removeInvalidCharacters', () => {
  it('should remove invalid characters from a string', () => {
    const input = 'example-string(123)';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('examplestring123');
  });

  it('should handle strings with only valid characters', () => {
    const input = 'ValidString123';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('ValidString123');
  });

  it('should return an empty string if input contains only invalid characters', () => {
    const input = '!@#$%^&*()';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('');
  });

  it('should handle empty input strings', () => {
    const input = '';
    const result = removeInvalidCharacters(input);
    expect(result).toBe('');
  });
});

describe('parseErrorBeforeTelemetry', () => {
  let axiosIsAxiosErrorSpy: ReturnType<typeof vi.spyOn>;
  let appendLogSpy: ReturnType<typeof vi.spyOn>;
  let localizeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    axiosIsAxiosErrorSpy = vi.spyOn(axios, 'isAxiosError');
    appendLogSpy = vi.spyOn(ext.outputChannel, 'appendLog');
    // Create a proper spy on the localize function with type casting to any
    localizeSpy = vi.spyOn(localizeModule, 'localize' as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return formatted API error message for Axios error with valid JSON response data', () => {
    const responseData = {
      error: {
        message: 'Not Found',
        code: '404',
      },
    };
    const encodedData = encoder.encode(JSON.stringify(responseData));
    const error: any = {
      message: 'Original error message',
      response: { data: encodedData },
    };
    axiosIsAxiosErrorSpy.mockReturnValue(true);
    const result = parseErrorBeforeTelemetry(error);
    const expectedMessage = 'API Error: 404 - Not Found';
    expect(result).toBe(expectedMessage);
    expect(localizeSpy).toHaveBeenCalledWith('apiError', `API Error: 404 - Not Found`);
    expect(appendLogSpy).toHaveBeenCalledWith(expectedMessage);
  });

  it('should return fallback error message when JSON parsing fails in Axios error', () => {
    const invalidData = encoder.encode('invalid json');
    const error: any = {
      message: 'Parsing failed',
      response: { data: invalidData },
    };
    axiosIsAxiosErrorSpy.mockReturnValue(true);
    const result = parseErrorBeforeTelemetry(error);
    expect(result).toBe('Parsing failed');
    expect(localizeSpy).not.toHaveBeenCalled();
    expect(appendLogSpy).not.toHaveBeenCalled();
  });

  it('should return error message for non-Axios Error instance', () => {
    const error = new Error('Regular error');
    axiosIsAxiosErrorSpy.mockReturnValue(false);
    const result = parseErrorBeforeTelemetry(error);
    expect(result).toBe('Regular error');
  });

  it('should return string conversion for non-error types', () => {
    const error = 42;
    const result = parseErrorBeforeTelemetry(error);
    expect(result).toBe('42');
  });
});

describe('generateCSharpClasses', () => {
  it('should generate C# class code from a class definition', () => {
    const classCode = generateCSharpClasses('NamespaceName', 'RootClass', {
      type: 'object',
      key1: { type: 'string', description: 'Key 1 description' },
    });
    expect(classCode).toContain('public class RootClass');
    expect(classCode).toContain('public string Key1 { get; set; }');
    expect(classCode).not.toContain('public HttpStatusCode StatusCode');
  });
});

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
    expect(classCode).not.toContain('public HttpStatusCode StatusCode');
  });
});

describe('generateClassCode', () => {
  it('should generate a C# class string for a class definition', () => {
    const classDef = {
      className: 'TestClass',
      description: 'A test class',
      properties: [
        { propertyName: 'Property1', propertyType: 'string', description: 'A string property', isObject: false },
        { propertyName: 'Property2', propertyType: 'int', description: 'An integer property', isObject: false },
      ],
      children: [],
    };
    const classCode = generateClassCode(classDef);
    expect(classCode).toContain('public class TestClass');
    expect(classCode).toContain('public string Property1 { get; set; }');
    expect(classCode).toContain('public int Property2 { get; set; }');
    expect(classCode).toContain('this.StatusCode = HttpStatusCode.OK;');
  });
});

describe('logTelemetry function', () => {
  it('should add properties to context.telemetry.properties', () => {
    const context = { telemetry: { properties: {} } } as unknown as IAzureConnectorsContext;
    logTelemetry(context, { key1: 'value1', key2: 'value2' });
    expect(context.telemetry.properties).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should merge properties when called multiple times', () => {
    const context = { telemetry: { properties: { key1: 'initialValue' } } } as unknown as IAzureConnectorsContext;
    logTelemetry(context, { key2: 'value2' });
    expect(context.telemetry.properties).toEqual({ key1: 'initialValue', key2: 'value2' });
    logTelemetry(context, { key1: 'updatedValue', key3: 'value3' });
    expect(context.telemetry.properties).toEqual({ key1: 'updatedValue', key2: 'value2', key3: 'value3' });
  });
});

describe('processAndWriteMockableOperations', () => {
  let writeFileSpy: any;
  let ensureDirSpy: any;

  beforeEach(() => {
    writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockResolvedValue();
    ext.outputChannel = { appendLog: vi.fn() } as any;
    // Set designTimePort and stub axios.get so isMockable works without error
    ext.designTimePort = 1234;
    vi.spyOn(axios, 'get').mockResolvedValue({ data: ['Http'] });
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
    const expectedMockOutputsFolder = path.join(projectPath, 'MockOutputs');
    expect(ensureDirSpy).toHaveBeenCalledWith(expectedMockOutputsFolder);
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
    const expectedFileName = 'WhenAHTTPRequestIsReceivedTriggerOutput.cs';
    const expectedFilePath = path.join(expectedMockOutputsFolder, expectedFileName);
    expect(writeFileSpy).toHaveBeenCalledWith(expectedFilePath, expect.any(String), 'utf-8');
  });
});

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
      description: 'Class for RootClass representing an object with properties.',
      properties: [
        { propertyName: 'Key1', propertyType: 'string', description: 'Key 1 description', isObject: false },
        { propertyName: 'Nested', propertyType: 'RootClassNested', description: null, isObject: true },
      ],
      children: [
        {
          className: 'RootClassNested',
          description: 'Class for RootClassNested representing an object with properties.',
          properties: [{ propertyName: 'NestedKey', propertyType: 'bool', description: 'Nested key description', isObject: false }],
          children: [],
        },
      ],
    });
  });
});

describe('mapJsonTypeToCSharp', () => {
  it('should map JSON types to C# types correctly', () => {
    expect(mapJsonTypeToCSharp('string')).toBe('string');
    expect(mapJsonTypeToCSharp('string', 'date-time')).toBe('DateTime');
    expect(mapJsonTypeToCSharp('boolean')).toBe('bool');
    expect(mapJsonTypeToCSharp('integer')).toBe('int');
    expect(mapJsonTypeToCSharp('number')).toBe('double');
    expect(mapJsonTypeToCSharp('object')).toBe('JObject');
    expect(mapJsonTypeToCSharp('any')).toBe('JObject');
    expect(mapJsonTypeToCSharp('array')).toBe('List<object>');
  });
});
