import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import * as childProcess from 'child_process';
import * as fse from 'fs-extra';
import * as util from 'util';
import path from 'path';
import * as localizeModule from '../../../localize';
import * as vscodeConfigSettings from '../../utils/vsCodeConfig/settings';
import * as cpUtils from '../../utils/funcCoreTools/cpUtils';
import { ext } from '../../../extensionVariables';
import {
  extractAndValidateRunId,
  validateRunId,
  removeInvalidCharacters,
  parseErrorBeforeTelemetry,
  generateCSharpClasses,
  generateClassCode,
  logTelemetry,
  getOperationMockClassContent,
  buildClassDefinition,
  mapJsonTypeToCSharp,
  createCsprojFile,
  updateCsprojFile,
  createTestCsFile,
  createTestExecutorFile,
  createTestSettingsConfigFile,
  updateTestsSln,
  validateWorkflowPath,
  validateUnitTestName,
} from '../unitTests';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

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
  ext.designTimeInstances.set(projectPath, {
    port: 1234,
    process: {} as childProcess.ChildProcess,
  });
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

describe('validateUnitTestName', () => {
  const testProjectPath = path.join('test', 'project', 'LogicApp1');
  const testWorkflowName = 'workflow1';
  let localizeSpy: any;

  beforeEach(() => {
    localizeSpy = vi
      .spyOn(localizeModule, 'localize')
      .mockImplementation((key: string, defaultMessage: string, ...args: any[]) => defaultMessage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return an error if unit test name is empty', async () => {
    const result = await validateUnitTestName(testProjectPath, testWorkflowName, '');
    expect(result).toBe('The unit test name cannot be empty.');
  });

  it('should return an error if unit test name contains invalid characters', async () => {
    const result = await validateUnitTestName(testProjectPath, testWorkflowName, 'Invalid@Name');
    expect(result).toBe('Unit test name must start with a letter and can only contain letters, digits, "_" and "-".');
  });

  it('should return an error if another folder with the same name exists in the test project', async () => {
    vi.spyOn(fse, 'existsSync').mockReturnValue(true);
    vi.spyOn(fse, 'readdir').mockResolvedValue(['TestActionMock.cs']);
    const result = await validateUnitTestName(testProjectPath, testWorkflowName, 'test1');
    expect(result).toBe('Another folder with this name already exists in the test project.');
  });

  it('should return an error if another unit test with the same name exists in the test project', async () => {
    vi.spyOn(fse, 'existsSync').mockReturnValue(true);
    vi.spyOn(fse, 'readdir').mockResolvedValue(['test1.cs']);
    const result = await validateUnitTestName(testProjectPath, testWorkflowName, 'test1');
    expect(result).toBe('A unit test with this name already exists in the test project.');
  });

  it('should return undefined if the unit test name is valid', async () => {
    vi.spyOn(fse, 'existsSync').mockReturnValue(false);
    const result = await validateUnitTestName(testProjectPath, testWorkflowName, 'Valid_Test');
    expect(result).toBeUndefined();
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

describe('generateCSharpClasses - StatusCode Removal', () => {
  it('should not have StatusCode property from the generated class definition', () => {
    // Simulate JSON output with a redundant StatusCode property.
    const dataWithStatusCode = {
      nestedTypeProperty: 'object',
      Body: { nestedTypeProperty: 'object', description: 'Response body' },
      StatusCode: { nestedTypeProperty: 'integer', description: 'The status code' },
    };

    const classCode = generateCSharpClasses('TestNamespace', 'TestClass', 'WorkflowName', 'Action', 'MockClass', dataWithStatusCode, false);

    // The generated code should include the constructor setting the base's StatusCode.
    expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
    // It should not contain a separate integer property for StatusCode in the class body.
    expect(classCode).not.toContain('public int StatusCode { get; set; }');
    // Optionally, check that other properties are still generated correctly.
    expect(classCode).toContain('public JObject Body { get; set; }');
  });

  it('should not remove properties other than StatusCode', () => {
    const dataWithoutStatusCode = {
      nestedTypeProperty: 'object',
      Key1: { nestedTypeProperty: 'string', description: 'Test key description' },
    };

    const classCode = generateCSharpClasses(
      'TestNamespace',
      'TestClass',
      'WorkflowName',
      'Action',
      'MockClass',
      dataWithoutStatusCode,
      false
    );

    // Ensure that a valid property is generated.
    expect(classCode).toContain('public string Key1 { get; set; }');
    // And still the base class initialization for StatusCode should be present.
    expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
  });

  it('should have StatusCode property if is HTTP action', () => {
    // Simulate JSON output with a redundant StatusCode property.
    const dataWithStatusCode = {
      nestedTypeProperty: 'object',
      Body: { nestedTypeProperty: 'object', description: 'Response body' },
      StatusCode: { nestedTypeProperty: 'integer', description: 'The status code' },
    };

    const classCode = generateCSharpClasses('TestNamespace', 'TestClass', 'WorkflowName', 'Action', 'MockClass', dataWithStatusCode, true);

    // The generated code should include the constructor setting the base's StatusCode.
    expect(classCode).toContain('public HttpStatusCode StatusCode {get; set;}');
    expect(classCode).toContain('this.StatusCode = HttpStatusCode.OK;');
    // It should not contain a separate integer property for StatusCode in the class body.
    expect(classCode).not.toContain('public int StatusCode { get; set; }');
    // Optionally, check that other properties are still generated correctly.
    expect(classCode).toContain('public JObject Body { get; set; }');
  });
});

describe('generateCSharpClasses', () => {
  it('should generate C# class code from a class definition non HTTP action', () => {
    const workflowName = 'TestWorkflow';
    const mockType = 'Action';
    const mockClassName = 'MockClass';
    const classCode = generateCSharpClasses(
      'NamespaceName',
      'RootClass',
      workflowName,
      mockType,
      mockClassName,
      {
        nestedTypeProperty: 'object',
        key1: { nestedTypeProperty: 'string', description: 'Key 1 description' },
      },
      false
    );

    expect(classCode).toContain('public class RootClass');
    expect(classCode).toContain('/// Key 1 description');
    expect(classCode).toContain('public string Key1 { get; set; }');
    expect(classCode).not.toContain('public HttpStatusCode StatusCode');

    expect(classCode).toContain('public RootClass()');
    expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
    expect(classCode).toContain('this.Key1 = string.Empty;');
  });

  it('should generate C# class code from a class definition HTTP action', () => {
    const workflowName = 'TestWorkflow';
    const mockType = 'Action';
    const mockClassName = 'MockClass';
    const classCode = generateCSharpClasses(
      'NamespaceName',
      'RootClass',
      workflowName,
      mockType,
      mockClassName,
      {
        nestedTypeProperty: 'object',
        key1: { nestedTypeProperty: 'string', description: 'Key 1 description' },
      },
      true
    );

    expect(classCode).toContain('public class RootClass');
    expect(classCode).toContain('/// Key 1 description');
    expect(classCode).toContain('public string Key1 { get; set; }');
    expect(classCode).toContain('public HttpStatusCode StatusCode {get; set;}');

    expect(classCode).toContain('public RootClass()');
    expect(classCode).toContain('this.StatusCode = HttpStatusCode.OK;');
    expect(classCode).toContain('this.Key1 = string.Empty;');
  });
});

describe('generateCSharpClasses - Naming and Namespace Validation', () => {
  it('should generate a C# class with a valid class name and namespace structure', () => {
    const namespaceName = 'MyLogicApp';
    const rootClassName = 'SomeOperationMockOutput';
    const workflowName = 'TestWorkflow';
    const mockType = 'Action';
    const mockClassName = 'MockClass';
    const data = {
      nestedTypeProperty: 'object',
      key: { nestedTypeProperty: 'string', description: 'test key' },
    };
    const classCode = generateCSharpClasses(namespaceName, rootClassName, workflowName, mockType, mockClassName, data, false);

    expect(classCode).toContain('using Newtonsoft.Json.Linq;');
    expect(classCode).toContain('using System.Collections.Generic;');
    expect(classCode).toContain('using System.Net;');
    expect(classCode).toContain('using System;');

    expect(classCode).toContain(`public class ${rootClassName}`);
    expect(classCode).toContain(`namespace ${namespaceName}.Tests.Mocks`);
    expect(classCode).not.toContain('public HttpStatusCode StatusCode');
  });
});

describe('generateClassCode', () => {
  it('should generate a C# class string for a class definition non HTTP', () => {
    const classDef = {
      className: 'TestClassMockOutput',
      description: 'A test class',
      properties: [
        { propertyName: 'Property1', propertyType: 'string', description: 'A string property', isObject: false },
        { propertyName: 'Property2', propertyType: 'int', description: 'An integer property', isObject: false },
        { propertyName: 'DTProperty', propertyType: 'DateTime', description: 'A DateTime property', isObject: false },
      ],
      children: [],
      inheritsFrom: 'MockOutput',
    };
    const classCode = generateClassCode(classDef, false);
    expect(classCode).toContain('public class TestClass');
    expect(classCode).toContain('public string Property1 { get; set; }');
    expect(classCode).toContain('public int Property2 { get; set; }');
    expect(classCode).toContain('public DateTime DTProperty { get; set; }');

    expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
    const setStatusCodeOccurrences = classCode.split('this.StatusCode = HttpStatusCode.OK;').length - 1;
    expect(setStatusCodeOccurrences).toBe(0);
    expect(classCode).toContain('this.Property1 = string.Empty;');
    expect(classCode).toContain('this.Property2 = 0;');
    expect(classCode).toContain('this.DTProperty = new DateTime();');
  });

  it('should generate a C# class string for a class definition HTTP', () => {
    const classDef = {
      className: 'TestClassMockOutput',
      description: 'A test class',
      properties: [
        { propertyName: 'Property1', propertyType: 'string', description: 'A string property', isObject: false },
        { propertyName: 'Property2', propertyType: 'int', description: 'An integer property', isObject: false },
        { propertyName: 'DTProperty', propertyType: 'DateTime', description: 'A DateTime property', isObject: false },
      ],
      children: [],
      inheritsFrom: 'MockOutput',
    };
    const classCode = generateClassCode(classDef, true);
    expect(classCode).toContain('public class TestClass');
    expect(classCode).toContain('public HttpStatusCode StatusCode {get; set;}');
    expect(classCode).toContain('public string Property1 { get; set; }');
    expect(classCode).toContain('public int Property2 { get; set; }');
    expect(classCode).toContain('public DateTime DTProperty { get; set; }');

    expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
    const setStatusCodeOccurrences = classCode.split('this.StatusCode = HttpStatusCode.OK;').length - 1;
    expect(setStatusCodeOccurrences).toBe(0);
    expect(classCode).toContain('this.Property1 = string.Empty;');
    expect(classCode).toContain('this.Property2 = 0;');
    expect(classCode).toContain('this.DTProperty = new DateTime();');
  });

  it('should generate multiple C# classes for nested class definitions', () => {
    const classDef = {
      className: 'ParentClass',
      description: 'A parent class',
      properties: [{ propertyName: 'Child', propertyType: 'ChildClass', description: 'A child class', isObject: true }],
      children: [
        {
          className: 'ChildClass',
          description: 'A child class',
          properties: [{ propertyName: 'NestedProperty', propertyType: 'string', description: 'A nested property', isObject: false }],
          children: [],
        },
      ],
      inheritsFrom: 'MockOutput',
    };

    const classCode = generateClassCode(classDef);
    expect(classCode).toContain('public class ParentClass');
    expect(classCode).toContain('public ChildClass Child { get; set; }');
    const setChildOccurrences = classCode.split('this.Child = new ChildClass();').length - 1;
    expect(setChildOccurrences).toBe(1);
    expect(classCode).toContain('public class ChildClass');
    expect(classCode).toContain('public string NestedProperty { get; set; }');
    expect(classCode).toContain('this.NestedProperty = string.Empty;');
  });
});

describe('logTelemetry function', () => {
  it('should add properties to context.telemetry.properties', () => {
    const context = { telemetry: { properties: {} } } as unknown as IActionContext;
    logTelemetry(context, { key1: 'value1', key2: 'value2' });
    expect(context.telemetry.properties).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should merge properties when called multiple times', () => {
    const context = { telemetry: { properties: { key1: 'initialValue' } } } as unknown as IActionContext;
    logTelemetry(context, { key2: 'value2' });
    expect(context.telemetry.properties).toEqual({ key1: 'initialValue', key2: 'value2' });
    logTelemetry(context, { key1: 'updatedValue', key3: 'value3' });
    expect(context.telemetry.properties).toEqual({ key1: 'updatedValue', key2: 'value2', key3: 'value3' });
  });
});

describe('getOperationMockClassContent with no actions', () => {
  let readFileSpy: any;

  beforeEach(() => {
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(
      JSON.stringify({
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          actions: {},
          contentVersion: '1.0.0.0',
          outputs: {},
          triggers: {
            When_a_HTTP_request_is_received: {
              type: 'Request',
              kind: 'Http',
            },
          },
        },
        kind: 'Stateful',
      })
    );
    ext.outputChannel = { appendLog: vi.fn() } as any;
    ext.designTimeInstances.set(projectPath, {
      port: 1234,
      process: {} as childProcess.ChildProcess,
    });
    vi.spyOn(axios, 'get').mockResolvedValue({ data: ['Request'] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should gracefully handle workflows with no actions', async () => {
    const operationInfo = {
      When_a_HTTP_request_is_received: { type: 'Request', operationId: 'When_a_HTTP_request_is_received' },
    };
    const outputParameters = {
      When_a_HTTP_request_is_received: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy description' },
        },
      },
    };
    const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
      operationInfo,
      outputParameters,
      projectPath,
      'workflowName',
      fakeLogicAppName
    );
    expect(Object.keys(mockClassContent).length).toEqual(1);
    expect(mockClassContent['WhenAHTTPRequestIsReceivedTriggerOutput']).toContain('public class WhenAHTTPRequestIsReceivedTriggerOutput');
    expect(Object.keys(foundActionMocks).length).toEqual(0);
    expect(Object.keys(foundTriggerMocks).length).toEqual(1);
  });
});

describe('getOperationMockClassContent', () => {
  let readFileSpy: any;

  beforeEach(() => {
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(
      JSON.stringify({
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          actions: {
            Complete_the_message_in_a_queue: {
              type: 'ApiConnection',
              inputs: {
                host: {
                  connection: {
                    referenceName: 'servicebus',
                  },
                },
                method: 'delete',
                path: "/@{encodeURIComponent(encodeURIComponent('test'))}/messages/complete",
                queries: {
                  lockToken: "@triggerBody()?['LockToken']",
                  queueType: 'Main',
                  sessionId: '',
                },
              },
              runAfter: {},
            },
          },
          contentVersion: '1.0.0.0',
          outputs: {},
          triggers: {
            WhenAHTTPRequestIsReceived: {
              type: 'ApiConnection',
              inputs: {
                host: {
                  connection: {
                    referenceName: 'servicebus',
                  },
                },
                method: 'get',
                path: "/@{encodeURIComponent(encodeURIComponent('test'))}/messages/head/peek",
                queries: {
                  queueType: 'Main',
                  sessionId: 'None',
                },
              },
              recurrence: {
                interval: 3,
                frequency: 'Minute',
              },
            },
          },
        },
        kind: 'Stateful',
      })
    );
    ext.outputChannel = { appendLog: vi.fn() } as any;
    // Set designTimePort and stub axios.get so isMockable works without error
    ext.designTimeInstances.set(projectPath, {
      port: 1234,
      process: {} as childProcess.ChildProcess,
    });
    vi.spyOn(axios, 'get').mockResolvedValue({ data: ['Http', 'HttpWebhook'] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw an error when no trigger exists in the workflow is provided', async () => {
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(
      JSON.stringify({
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          actions: {
            Complete_the_message_in_a_queue: {
              type: 'ApiConnection',
              inputs: {
                host: {
                  connection: {
                    referenceName: 'servicebus',
                  },
                },
                method: 'delete',
                path: "/@{encodeURIComponent(encodeURIComponent('test'))}/messages/complete",
                queries: {
                  lockToken: "@triggerBody()?['LockToken']",
                  queueType: 'Main',
                  sessionId: '',
                },
              },
              runAfter: {},
            },
          },
          contentVersion: '1.0.0.0',
          outputs: {},
          triggers: {},
        },
        kind: 'Stateful',
      })
    );

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

    expect(
      getOperationMockClassContent(operationInfo, outputParameters, projectPath, 'workflowName', fakeLogicAppName)
    ).rejects.toThrowError();
  });

  it('should return mock action/trigger class contents for each operation in the workflow', async () => {
    const operationInfo = {
      ReadAResourceGroup: { type: 'Http', operationId: 'ReadAResourceGroup' },
      WhenAHTTPRequestIsReceived: { type: 'HttpWebhook', operationId: 'WhenAHTTPRequestIsReceived' },
    };
    const outputParameters = {
      ReadAResourceGroup: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy description' },
        },
      },
      WhenAHTTPRequestIsReceived: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy trigger description' },
        },
      },
    };
    const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
      operationInfo,
      outputParameters,
      projectPath,
      'workflowName',
      fakeLogicAppName
    );
    expect(mockClassContent).toHaveProperty('ReadAResourceGroupActionOutput');
    expect(mockClassContent).toHaveProperty('WhenAHTTPRequestIsReceivedTriggerOutput');
    expect(mockClassContent['ReadAResourceGroupActionOutput']).toContain('public class ReadAResourceGroupActionOutput');
    expect(mockClassContent['WhenAHTTPRequestIsReceivedTriggerOutput']).toContain('public class WhenAHTTPRequestIsReceivedTriggerOutput');
    expect(Object.keys(foundActionMocks).length).toEqual(1);
    expect(Object.keys(foundTriggerMocks).length).toEqual(1);
  });

  it('should return a single copy of mock class contents for identical operations', async () => {
    const operationInfo = {
      ReadAResourceGroup: { type: 'Http', operationId: 'ReadAResourceGroup' },
      ReadAResourceGroupDuplicate: { type: 'Http', operationId: 'ReadAResourceGroup' },
      WhenAHTTPRequestIsReceived: { type: 'HttpWebhook', operationId: 'WhenAHTTPRequestIsReceived' },
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
      WhenAHTTPRequestIsReceived: {
        outputs: {
          'outputs.$.dummy': { type: 'string', description: 'dummy trigger description' },
        },
      },
    };
    const { mockClassContent, foundActionMocks, foundTriggerMocks } = await getOperationMockClassContent(
      operationInfo,
      outputParameters,
      projectPath,
      'workflowName',
      fakeLogicAppName
    );
    expect(Object.keys(mockClassContent).length).toEqual(2);
    expect(Object.keys(foundActionMocks).length).toEqual(1);
    expect(Object.keys(foundTriggerMocks).length).toEqual(1);
  });
});

describe('buildClassDefinition', () => {
  it('should build a class definition for an object', () => {
    const classDef = buildClassDefinition('RootClass', {
      nestedTypeProperty: 'object',
      '@key1~1description': { nestedTypeProperty: 'string', description: 'Key 1 description', title: 'Key 1 Description' },
      nested: {
        nestedTypeProperty: 'object',
        nestedKey: { nestedTypeProperty: 'boolean', description: 'Nested key description' },
        nestedKey2: { nestedTypeProperty: 'string', format: 'date-time', description: 'Nested key 2 description' },
      },
    });
    expect(classDef).toEqual({
      className: 'RootClass',
      description: 'Class for RootClass representing an object with properties.',
      properties: [
        {
          propertyName: 'Key1Description',
          propertyType: 'string',
          description: 'Key 1 description',
          isObject: false,
          jsonPropertyName: '@key1.description',
        },
        { propertyName: 'Nested', propertyType: 'RootClassNested', description: null, isObject: true, jsonPropertyName: null },
      ],
      children: [
        {
          className: 'RootClassNested',
          description: 'Class for RootClassNested representing an object with properties.',
          properties: [
            {
              propertyName: 'NestedKey',
              propertyType: 'bool',
              description: 'Nested key description',
              isObject: false,
              jsonPropertyName: null,
            },
            {
              propertyName: 'NestedKey2',
              propertyType: 'DateTime',
              description: 'Nested key 2 description',
              isObject: false,
              jsonPropertyName: null,
            },
          ],
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

describe('createCsprojFile', () => {
  const testProjectFileTemplate = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="MSTest" Version="3.2.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="MSTest.TestAdapter" Version="3.2.0" />
    <PackageReference Include="MSTest.TestFramework" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Workflows.WebJobs.Tests.Extension" Version="1.0.0-preview" />
    <PackageReference Include="coverlet.collector" Version="3.1.2" />
  </ItemGroup>
</Project>`;
  const csprojFilePath: string = 'dummy.csproj';
  let writeFileSpy: any;
  let readFileSpy: any;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testProjectFileTemplate);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a C# project file with the correct content', async () => {
    const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(false);

    await createCsprojFile(csprojFilePath);

    expect(pathExistsSpy).toHaveBeenCalledWith(csprojFilePath);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledWith(csprojFilePath, testProjectFileTemplate);
  });

  it('should not overwrite an existing C# project file', async () => {
    const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(true);

    await createCsprojFile(csprojFilePath);

    expect(pathExistsSpy).toHaveBeenCalledWith(csprojFilePath);
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
  });
});

describe('updateCsprojFile', () => {
  let readFileSpy: any;
  let writeFileSpy: any;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add a new ItemGroup and update the file when the content does not exist', async () => {
    const csprojFilePath = 'dummy.csproj';
    const workflowName = 'MyWorkflow';

    const xmlMissingUnitTestSettingsConfig = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="MSTest" Version="3.2.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="MSTest.TestAdapter" Version="3.2.0" />
    <PackageReference Include="MSTest.TestFramework" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Workflows.WebJobs.Tests.Extension" Version="1.0.0-preview" />
    <PackageReference Include="coverlet.collector" Version="3.1.2" />
  </ItemGroup>
</Project>`;

    readFileSpy = vi
      .spyOn(fse, 'readFile')
      .mockImplementation((file, encoding, callback) => callback(null, xmlMissingUnitTestSettingsConfig));
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();

    await updateCsprojFile(csprojFilePath, workflowName);

    expect(readFileSpy).toHaveBeenCalled();
    expect(writeFileSpy).toHaveBeenCalledWith(
      csprojFilePath,
      expect.stringContaining('%(RecursiveDir)%(Filename)%(Extension)'),
      'utf8',
      expect.any(Function)
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
  });

  it('should not update the file when the <Content> already exists', async () => {
    const csprojFilePath = 'dummy.csproj';
    const workflowName = 'MyWorkflow';
    const contentInclude = path.join(workflowName, '*.config');
    const contentLink = path.join(workflowName, '%(RecursiveDir)%(Filename)%(Extension)');

    const xmlWithUnitTestSettingsConfig = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="MSTest" Version="3.2.0" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="MSTest.TestAdapter" Version="3.2.0" />
    <PackageReference Include="MSTest.TestFramework" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Workflows.WebJobs.Tests.Extension" Version="1.0.0-preview" />
    <PackageReference Include="coverlet.collector" Version="3.1.2" />
  </ItemGroup>
  <ItemGroup Label="UnitTestSettingsConfig">
    <Content Include="${contentInclude}" Link="${contentLink}">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>
</Project>`;

    readFileSpy = vi.spyOn(fse, 'readFile').mockImplementation((file, encoding, callback) => callback(null, xmlWithUnitTestSettingsConfig));
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();

    await updateCsprojFile(csprojFilePath, workflowName);

    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalled();
  });

  it('should throw an error when reading the file fails', async () => {
    const csprojFilePath = 'dummy.csproj';
    const workflowName = 'MyWorkflow';
    const readError = new Error('read error');

    vi.spyOn(fse, 'readFile').mockImplementation((file: string, encoding: string, callback: (err: Error | null, data?: string) => void) => {
      callback(readError, undefined);
    });

    expect(() => updateCsprojFile(csprojFilePath, workflowName)).rejects.toThrowError(readError);
  });

  it('should throw an error when parsing XML fails', async () => {
    const csprojFilePath = 'dummy.csproj';
    const workflowName = 'MyWorkflow';
    const invalidXml = `<Project></Project`;

    vi.spyOn(fse, 'readFile').mockImplementation((file: string, encoding: string, callback: (err: Error | null, data?: string) => void) => {
      callback(null, invalidXml);
    });

    expect(() => updateCsprojFile(csprojFilePath, workflowName)).rejects.toThrowError();
  });
});

describe('createTestCsFile', () => {
  const unitTestFolderPath: string = 'unitTestFolderPath';
  const unitTestName: string = 'TestBlankClass';
  const workflowName: string = 'MyWorkflow';
  const logicAppName: string = 'My-Logic-App';
  const actionName: string = 'MyAction';
  const actionOutputClassName: string = 'MyActionMockOutput';
  const actionMockClassName: string = 'MyActionMock';
  const triggerOutputClassName: string = 'MyTriggerMockOutput';
  const triggerMockClassName: string = 'MyTriggerMock';
  let writeFileSpy: any;
  let isBlank: boolean;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a C# file using the TestBlankClassFile template when creating from scratch', async () => {
    isBlank = true;

    const testBlankClassFileTemplate = `using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Azure.Workflows.UnitTesting.Definitions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using <%= LogicAppName %>.Tests.Mocks.<%= SanitizedWorkflowName %>;

namespace <%= LogicAppName %>.Tests
{
    /// <summary>
    /// The unit test class.
    /// </summary>
    [TestClass]
    public class <%= UnitTestName %>
    {
        /// <summary>
        /// The unit test executor.
        /// </summary>
        public TestExecutor TestExecutor;

        [TestInitialize]
        public void Setup()
        {
            this.TestExecutor = new TestExecutor("<%= WorkflowName %>/testSettings.config");
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with static mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample1()
        {
            // PREPARE Mock
            // Generate mock trigger data.
            var triggerMockOutput = new <%= TriggerMockOutputClassName %>();
            // Sample of how to set the properties of the triggerMockOutput
            // triggerMockOutput.Body.Flag = true;
            var triggerMock = new <%= TriggerMockClassName %>(outputs: triggerMockOutput);

            // Generate mock action data.
            var actionMockOutput = new <%= ActionMockOutputClassName %>();
            // Sample of how to set the properties of the actionMockOutput
            // actionMockOutput.Body.Name = "SampleResource";
            // actionMockOutput.Body.Id = "SampleId";
            var actionMock = new <%= ActionMockClassName %>(name: "<%= ActionMockName %>", outputs: actionMockOutput);

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
           var testMock = new TestMockDefinition(
                triggerMock: triggerMock,
                actionMocks: new Dictionary<string, ActionMock>()
                {
                    {actionMock.Name, actionMock}
                });
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: testMock).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with dynamic mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample2()
        {
            // PREPARE
            // Generate mock trigger data.
            var triggerMockOutput = new <%= TriggerMockOutputClassName %>();
            // Sample of how to set the properties of the triggerMockOutput
            // triggerMockOutput.Body.Flag = true;
            var triggerMock = new <%= TriggerMockClassName %>(outputs: triggerMockOutput);

            // Generate mock action data.
            // OPTION 1 : defining a callback function
            var actionMock = new <%= ActionMockClassName %>(name: "<%= ActionMockName %>", onGetActionMock: <%= ActionMockClassName %>OutputCallback);
            // OPTION 2: defining inline using a lambda
            /*var actionMock = new <%= ActionMockClassName %>(name: "<%= ActionMockName %>", onGetActionMock: (testExecutionContext) =>
            {
                return new <%= ActionMockClassName %>(
                    status: TestWorkflowStatus.Succeeded,
                    outputs: new <%= ActionMockOutputClassName %> {
                        // set the desired properties here
                        // if this acount contains a JObject Body
                        // Body = "something".ToJObject()
                    }
                );
            });*/

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testMock = new TestMockDefinition(
                triggerMock: triggerMock,
                actionMocks: new Dictionary<string, ActionMock>()
                {
                    {actionMock.Name, actionMock}
                });
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: testMock).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }

        #region Mock generator helpers

        /// <summary>
        /// The callback method to dynamically generate mocked data for the action named 'actionName'.
        /// You can modify this method to return different mock status, outputs, and error based on the test scenario.
        /// </summary>
        /// <param name="context">The test execution context that contains information about the current test run.</param>
        public <%= ActionMockClassName %> <%= ActionMockClassName %>OutputCallback(TestExecutionContext context)
        {
            // Sample mock data : Modify the existing mocked data dynamically for "actionName".
            return new <%= ActionMockClassName %>(
                status: TestWorkflowStatus.Succeeded,
                outputs: new <%= ActionMockOutputClassName %> {
                    // set the desired properties here
                    // if this acount contains a JObject Body
                    // Body = "something".ToJObject()
                }
            );
        }

        #endregion
    }
}`;

    const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testBlankClassFileTemplate);

    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestCsFile(
      unitTestFolderPath,
      unitTestName,
      cleanedUnitTestName,
      workflowName,
      cleanedWorkflowName,
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      isBlank
    );

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`var triggerMockOutput = new ${triggerOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`var triggerMock = new ${triggerMockClassName}(outputs: triggerMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`var actionMockOutput = new ${actionOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`var actionMock = new ${actionMockClassName}(name: "${actionName}", outputs: actionMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`public ${actionMockClassName} ${actionMockClassName}OutputCallback(TestExecutionContext context)`)
    );
  });

  it('should create a C# file using the TestClassFile template when creating from run', async () => {
    isBlank = false;

    const testClassFileTemplate = `using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Workflows.Common.ErrorResponses;
using Microsoft.Azure.Workflows.UnitTesting;
using Microsoft.Azure.Workflows.UnitTesting.Definitions;
using Microsoft.Azure.Workflows.UnitTesting.ErrorResponses;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json;
using <%= LogicAppName %>.Tests.Mocks.<%= SanitizedWorkflowName %>;

namespace <%= LogicAppName %>.Tests
{
    /// <summary>
    /// The unit test class.
    /// </summary>
    [TestClass]
    public class <%= UnitTestName %>
    {
        /// <summary>
        /// The unit test executor.
        /// </summary>
        public TestExecutor TestExecutor;

        [TestInitialize]
        public void Setup()
        {
            this.TestExecutor = new TestExecutor("<%= WorkflowName %>/testSettings.config");
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with static mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample1()
        {
            // PREPARE Mock
            // Generate mock action and trigger data.
            var mockData = this.GetTestMockDefinition();
            var sampleActionMock = mockData.ActionMocks["<%= ActionMockName %>"];
            // sampleActionMock.Outputs["your-property-name"] = "your-property-value";

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: mockData).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with dynamic mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample2()
        {
            // PREPARE
            // Generate mock action and trigger data.
            var mockData = this.GetTestMockDefinition();
            // OPTION 1 : defining a callback function
            mockData.ActionMocks["<%= ActionMockName %>"] = new <%= ActionMockClassName %>(name: "<%= ActionMockName %>", onGetActionMock: <%= ActionMockClassName %>OutputCallback);
            // OPTION 2: defining inline using a lambda
            mockData.ActionMocks["<%= ActionMockName %>"] = new <%= ActionMockClassName %>(name: "<%= ActionMockName %>", onGetActionMock: (testExecutionContext) =>
            {
                return new <%= ActionMockClassName %>(
                    status: TestWorkflowStatus.Succeeded,
                    outputs: new <%= ActionMockOutputClassName %> {
                        // set the desired properties here
                        // if this acount contains a JObject Body
                        // Body = "something".ToJObject()
                    }
                );
            });
            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: mockData).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with failed mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_FAILED_Sample3()
        {
            // PREPARE
            // Generate mock action and trigger data.
            var mockData = this.GetTestMockDefinition();
            var mockError = new TestErrorInfo(code: ErrorResponseCode.BadRequest, message: "Input is invalid.");
            mockData.ActionMocks["<%= ActionMockName %>"] = new <%= ActionMockClassName %>(status: TestWorkflowStatus.Failed, error: mockError);

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: mockData).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Failed, actual: testRun.Status);
        }

        #region Mock generator helpers

        /// <summary>
        /// Returns deserialized test mock data.  
        /// </summary>
        private TestMockDefinition GetTestMockDefinition()
        {
            var mockDataPath = Path.Combine(TestExecutor.rootDirectory, "Tests", TestExecutor.logicAppName, TestExecutor.workflow, "<%= UnitTestSubFolder %>", "<%= UnitTestMockJson %>");
            return JsonConvert.DeserializeObject<TestMockDefinition>(File.ReadAllText(mockDataPath));
        }

        /// <summary>
        /// The callback method to dynamically generate mocked data for the action named 'actionName'.
        /// You can modify this method to return different mock status, outputs, and error based on the test scenario.
        /// </summary>
        /// <param name="context">The test execution context that contains information about the current test run.</param>
        public <%= ActionMockClassName %> <%= ActionMockClassName %>OutputCallback(TestExecutionContext context)
        {
            // Sample mock data : Modify the existing mocked data dynamically for "actionName".
            return new <%= ActionMockClassName %>(
                status: TestWorkflowStatus.Succeeded,
                outputs: new <%= ActionMockOutputClassName %> {
                    // set the desired properties here
                    // if this acount contains a JObject Body
                    // Body = "something".ToJObject()
                }
            );
        }

        #endregion
    }
}`;

    const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testClassFileTemplate);

    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestCsFile(
      unitTestFolderPath,
      unitTestName,
      cleanedUnitTestName,
      workflowName,
      cleanedWorkflowName,
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      isBlank
    );

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`sampleActionMock.Outputs["your-property-name"] = "your-property-value";`)
    );
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(
        `mockData.ActionMocks["${actionName}"] = new ${actionMockClassName}(name: "${actionName}", onGetActionMock: ${actionMockClassName}OutputCallback);`
      )
    );
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`public ${actionMockClassName} ${actionMockClassName}OutputCallback(TestExecutionContext context)`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`var triggerMockOutput = new ${triggerOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`var triggerMock = new ${triggerMockClassName}(outputs: triggerMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`var actionMockOutput = new ${actionOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`var actionMock = new ${actionMockClassName}(name: "${actionName}", outputs: actionMockOutput);`)
    );
  });

  it('should create a C# file using the TestBlankClassFileWithoutActions template when creating from scratch using a workflow without actions', async () => {
    isBlank = true;

    const testBlankClassFileWithoutActionsTemplate = `using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Azure.Workflows.UnitTesting.Definitions;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using <%= LogicAppName %>.Tests.Mocks.<%= SanitizedWorkflowName %>;

namespace <%= LogicAppName %>.Tests
{
    /// <summary>
    /// The unit test class.
    /// </summary>
    [TestClass]
    public class <%= UnitTestName %>
    {
        /// <summary>
        /// The unit test executor.
        /// </summary>
        public TestExecutor TestExecutor;

        [TestInitialize]
        public void Setup()
        {
            this.TestExecutor = new TestExecutor("<%= WorkflowName %>/testSettings.config");
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with static mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample1()
        {
            // PREPARE Mock
            // Generate mock trigger data.
            var triggerMockOutput = new <%= TriggerMockOutputClassName %>();
            // Sample of how to set the properties of the triggerMockOutput
            // triggerMockOutput.Body.Flag = true;
            var triggerMock = new <%= TriggerMockClassName %>(outputs: triggerMockOutput);

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testMock = new TestMockDefinition(
                triggerMock: triggerMock,
                actionMocks: null);
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: testMock).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }
    }
}`;

    const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testBlankClassFileWithoutActionsTemplate);

    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestCsFile(
      unitTestFolderPath,
      unitTestName,
      cleanedUnitTestName,
      workflowName,
      cleanedWorkflowName,
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      isBlank
    );

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`var triggerMockOutput = new ${triggerOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`var triggerMock = new ${triggerMockClassName}(outputs: triggerMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`var actionMockOutput = new ${actionOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`var actionMock = new ${actionMockClassName}(name: "${actionName}", outputs: actionMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`public ${actionMockClassName} ${actionMockClassName}OutputCallback(TestExecutionContext context)`)
    );
  });

  it('should create a C# file using the TestClassFileWithoutActions template when creating from run using a workflow without actions', async () => {
    isBlank = false;

    const testClassFileWithoutActionsTemplate = `using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Workflows.Common.ErrorResponses;
using Microsoft.Azure.Workflows.UnitTesting;
using Microsoft.Azure.Workflows.UnitTesting.Definitions;
using Microsoft.Azure.Workflows.UnitTesting.ErrorResponses;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json;
using <%= LogicAppName %>.Tests.Mocks.<%= SanitizedWorkflowName %>;

namespace <%= LogicAppName %>.Tests
{
    /// <summary>
    /// The unit test class.
    /// </summary>
    [TestClass]
    public class <%= UnitTestName %>
    {
        /// <summary>
        /// The unit test executor.
        /// </summary>
        public TestExecutor TestExecutor;

        [TestInitialize]
        public void Setup()
        {
            this.TestExecutor = new TestExecutor("<%= WorkflowName %>/testSettings.config");
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with static mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_SUCCESS_Sample1()
        {
            // PREPARE Mock
            // Generate mock action and trigger data.
            var mockData = this.GetTestMockDefinition();
            // mockData.TriggerMock.Outputs["your-property-name"] = "your-property-value";

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: mockData).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Succeeded, actual: testRun.Status);
        }

        /// <summary>
        /// A sample unit test for executing the workflow named <%= WorkflowName %> with failed mocked data.
        /// This method shows how to set up mock data, execute the workflow, and assert the outcome.
        /// </summary>
        [TestMethod]
        public async Task <%= WorkflowName %>_<%= UnitTestName %>_ExecuteWorkflow_FAILED_Sample3()
        {
            // PREPARE
            // Generate mock action and trigger data.
            var mockData = this.GetTestMockDefinition();
            var mockError = new TestErrorInfo(code: ErrorResponseCode.BadRequest, message: "Input is invalid.");
            mockData.TriggerMock = new <%= TriggerMockClassName %>(status: TestWorkflowStatus.Failed, error: mockError);

            // ACT
            // Create an instance of UnitTestExecutor, and run the workflow with the mock data.
            var testRun = await this.TestExecutor
                .Create()
                .RunWorkflowAsync(testMock: mockData).ConfigureAwait(continueOnCapturedContext: false);

            // ASSERT
            // Verify that the workflow executed successfully, and the status is 'Succeeded'.
            Assert.IsNotNull(value: testRun);
            Assert.AreEqual(expected: TestWorkflowStatus.Failed, actual: testRun.Status);
        }

        #region Mock generator helpers

        /// <summary>
        /// Returns deserialized test mock data.  
        /// </summary>
        private TestMockDefinition GetTestMockDefinition()
        {
            var mockDataPath = Path.Combine(TestExecutor.rootDirectory, "Tests", TestExecutor.logicAppName, TestExecutor.workflow, "<%= UnitTestSubFolder %>", "<%= UnitTestMockJson %>");
            return JsonConvert.DeserializeObject<TestMockDefinition>(File.ReadAllText(mockDataPath));
        }

        #endregion
    }
}`;

    const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testClassFileWithoutActionsTemplate);

    const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
    const cleanedWorkflowName = workflowName.replace(/-/g, '_');
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestCsFile(
      unitTestFolderPath,
      unitTestName,
      cleanedUnitTestName,
      workflowName,
      cleanedWorkflowName,
      logicAppName,
      cleanedLogicAppName,
      actionName,
      actionOutputClassName,
      actionMockClassName,
      triggerOutputClassName,
      triggerMockClassName,
      isBlank
    );

    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`mockData.TriggerMock.Outputs["your-property-name"] = "your-property-value";`)
    );
    expect(writeFileSpyCalledWith[1]).toEqual(
      expect.stringContaining(`mockData.TriggerMock = new ${triggerMockClassName}(status: TestWorkflowStatus.Failed, error: mockError);`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`sampleActionMock.Outputs["your-property-name"] = "your-property-value";`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(
        `mockData.ActionMocks["${actionName}"] = new ${actionMockClassName}(name: "${actionName}", onGetActionMock: ${actionMockClassName}OutputCallback);`
      )
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`public ${actionMockClassName} ${actionMockClassName}OutputCallback(TestExecutionContext context)`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`var triggerMockOutput = new ${triggerOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`var triggerMock = new ${triggerMockClassName}(outputs: triggerMockOutput);`)
    );
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`var actionMockOutput = new ${actionOutputClassName}();`));
    expect(writeFileSpyCalledWith[1]).not.toEqual(
      expect.stringContaining(`var actionMock = new ${actionMockClassName}(name: "${actionName}", outputs: actionMockOutput);`)
    );
  });
});

describe('createTestExecutorFile', () => {
  const testExecutorFileTemplate = `using Microsoft.Azure.Workflows.UnitTesting;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;

namespace <%= LogicAppName %>.Tests
{
    public class TestExecutor
    {
        /// <summary>
        /// The root directory.
        /// </summary>
        public string rootDirectory;
        
        /// <summary>
        /// The logic app name.
        /// </summary>
        public string logicAppName;

        /// <summary>
        /// The workflow name.
        /// </summary>
        public string workflow;

        public TestExecutor(string configPath)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddXmlFile(configPath, optional: false, reloadOnChange: true)
                .Build();

            this.rootDirectory = configuration["TestSettings:WorkspacePath"];
            this.logicAppName = configuration["TestSettings:LogicAppName"];
            this.workflow = configuration["TestSettings:WorkflowName"];
        }

        #region Unit test executor

        public UnitTestExecutor Create()
        {
            // Set the path for workflow-related input files in the workspace and build the full paths to the required JSON files.
            var workflowDefinitionPath = Path.Combine(this.rootDirectory, this.logicAppName, this.workflow, "workflow.json");
            var connectionsPath = Path.Combine(this.rootDirectory, this.logicAppName, "connections.json");
            var parametersPath = Path.Combine(this.rootDirectory, this.logicAppName, "parameters.json");
            var localSettingsPath = Path.Combine(this.rootDirectory, this.logicAppName, "local.settings.json");
            
            return new UnitTestExecutor(
                workflowFilePath: workflowDefinitionPath,
                connectionsFilePath: connectionsPath,
                parametersFilePath: parametersPath,
                localSettingsFilePath: localSettingsPath
            );
        }

        #endregion

    }
}`;
  const logicAppName: string = 'My-LogicApp';
  const unitTestFolderPath: string = 'unitTestFolderPath';
  let readFileSpy: any;
  let writeFileSpy: any;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testExecutorFileTemplate);
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a test executor file when does not exist', async () => {
    const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestExecutorFile(unitTestFolderPath, cleanedLogicAppName);

    expect(pathExistsSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join('unitTestFolderPath', 'TestExecutor.cs'));
    expect(writeFileSpyCalledWith[1]).not.toEqual(expect.stringContaining(`namespace ${logicAppName}.Tests`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
  });

  it('should not create a test executor file when it already exists', async () => {
    const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

    await createTestExecutorFile(unitTestFolderPath, cleanedLogicAppName);

    expect(pathExistsSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
  });
});

describe('createTestSettingsConfig', () => {
  const testSettingsConfigFileTemplate = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
    <TestSettings>
        <WorkspacePath>%WorkspacePath%</WorkspacePath>
        <LogicAppName>%LogicAppName%</LogicAppName>
        <WorkflowName>%WorkflowName%</WorkflowName>
    </TestSettings>
</configuration>`;
  const unitTestFolderPath: string = 'unitTestFolderPath';
  const logicAppName: string = 'MyLogicApp';
  const workflowName: string = 'MyWorkflow';
  let readFileSpy: any;
  let writeFileSpy: any;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testSettingsConfigFileTemplate);
    writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a test settings config file when does not exist', async () => {
    const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(false);

    await createTestSettingsConfigFile(unitTestFolderPath, workflowName, logicAppName);

    expect(pathExistsSpy).toHaveBeenCalledTimes(1);
    expect(readFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
    expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, 'testSettings.config'));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining('<WorkspacePath>../../../../../</WorkspacePath>'));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`<LogicAppName>${logicAppName}</LogicAppName>`));
    expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`<WorkflowName>${workflowName}</WorkflowName>`));
  });
});

describe('updateSolutionWithProject', () => {
  const testDotnetBinaryPath = path.join('test', 'path', 'to', 'dotnet');
  let pathExistsSpy: any;
  let executeCommandSpy: any;

  beforeEach(() => {
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    vi.spyOn(util, 'promisify').mockImplementation((fn) => fn);
    vi.spyOn(vscodeConfigSettings, 'getGlobalSetting').mockReturnValue(testDotnetBinaryPath);
    executeCommandSpy = vi.spyOn(cpUtils, 'executeCommand').mockResolvedValue('');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should update the solution with the project when solution file exists', async () => {
    pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(true);

    const testsDirectory = path.join(projectPath, 'Tests');
    const logicAppCsprojPath = path.join(testsDirectory, `${fakeLogicAppName}.csproj`);

    await updateTestsSln(testsDirectory, logicAppCsprojPath);

    expect(executeCommandSpy).toHaveBeenCalledTimes(1);
    expect(executeCommandSpy).toHaveBeenCalledWith(
      ext.outputChannel,
      testsDirectory,
      `${testDotnetBinaryPath} sln "${path.join(testsDirectory, 'Tests.sln')}" add "${fakeLogicAppName}.csproj"`
    );
  });

  it('should create a new solution file when it does not exist', async () => {
    pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(false);

    const testsDirectory = path.join(projectPath, 'Tests');
    const logicAppCsprojPath = path.join(testsDirectory, `${fakeLogicAppName}.csproj`);

    await updateTestsSln(testsDirectory, logicAppCsprojPath);

    expect(executeCommandSpy).toHaveBeenCalledTimes(2);
    expect(executeCommandSpy).toHaveBeenCalledWith(ext.outputChannel, testsDirectory, `${testDotnetBinaryPath} new sln -n Tests`);
    expect(executeCommandSpy).toHaveBeenCalledWith(
      ext.outputChannel,
      testsDirectory,
      `${testDotnetBinaryPath} sln "${path.join(testsDirectory, 'Tests.sln')}" add "${fakeLogicAppName}.csproj"`
    );
  });
});

describe('validateWorkflowPath', () => {
  it('should throw an error if the workflow node is not valid', () => {
    const invalidWorkflowPath = path.join(projectPath, '..', fakeLogicAppName, 'workflow1', 'workflow.json');
    expect(() => validateWorkflowPath(projectPath, invalidWorkflowPath)).toThrowError("doesn't belong to the Logic Apps Standard Project");
  });

  it('should not throw an error if the workflow node is valid', () => {
    const validWorkflowPath = path.join(projectPath, fakeLogicAppName, 'workflow1', 'workflow.json');
    expect(() => validateWorkflowPath(projectPath, validWorkflowPath)).not.toThrowError();
  });
});
