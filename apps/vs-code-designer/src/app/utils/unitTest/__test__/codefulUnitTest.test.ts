import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import axios, { isAxiosError } from 'axios';
import * as childProcess from 'child_process';
import * as fse from 'fs-extra';
import * as util from 'util';
import path from 'path';
import * as localizeModule from '../../../../localize';
import * as vscodeConfigSettings from '../../vsCodeConfig/settings';
import * as cpUtils from '../../funcCoreTools/cpUtils';
import { ext } from '../../../../extensionVariables';

// Mock the isAxiosError function
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: actual.default,
    isAxiosError: vi.fn(),
  };
});
import {
  extractAndValidateRunId,
  removeInvalidCharacters,
  parseErrorBeforeTelemetry,
  generateCSharpClasses,
  generateMockOutputsClassContent,
  getOperationMockClassContent,
  buildOutputsClassDefinition,
  mapJsonTypeToCSharp,
  createCsprojFile,
  updateCsprojFile,
  createTestCsFile,
  createTestExecutorFile,
  createTestSettingsConfigFile,
  updateTestsSln,
  validateWorkflowPath,
  validateUnitTestName,
} from '../codefulUnitTest';
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
  vi.spyOn(axios, 'get').mockResolvedValue({ data: ['Request', 'Http', 'HttpWebhook'] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// Test Suites
// ============================================================================

describe('codefulUnitTest', () => {
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
    let isAxiosErrorSpy: ReturnType<typeof vi.spyOn>;
    let appendLogSpy: ReturnType<typeof vi.spyOn>;
    let localizeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      isAxiosErrorSpy = vi.mocked(isAxiosError);
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
      isAxiosErrorSpy.mockReturnValue(true);
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
      isAxiosErrorSpy.mockReturnValue(true);
      const result = parseErrorBeforeTelemetry(error);
      expect(result).toBe('Parsing failed');
      expect(localizeSpy).not.toHaveBeenCalled();
      expect(appendLogSpy).not.toHaveBeenCalled();
    });

    it('should return error message for non-Axios Error instance', () => {
      const error = new Error('Regular error');
      isAxiosErrorSpy.mockReturnValue(false);
      const result = parseErrorBeforeTelemetry(error);
      expect(result).toBe('Regular error');
    });

    it('should return string conversion for non-error types', () => {
      const error = 42;
      const result = parseErrorBeforeTelemetry(error);
      expect(result).toBe('42');
    });
  });

  describe('generateCSharpClasses - HTTP Action', () => {
    let mockClassTemplateContent: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const mockClassTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testMockClassTemplateName);
      mockClassTemplateContent = await realFs.readFile(mockClassTemplatePath, 'utf8');
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('TestMockClass')) return mockClassTemplateContent;
        throw new Error(`File not found: ${p}`);
      });
    });

    it('should generate C# class code from a class definition HTTP action', async () => {
      const workflowName = 'TestWorkflow';
      const mockType = 'Action';
      const mockClassName = 'MockClass';
      const classCode = await generateCSharpClasses(
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

    it('should generate C# class code from a class definition HTTP action with schema', async () => {
      const workflowName = 'TestWorkflow';
      const mockType = 'Action';
      const mockClassName = 'MockClass';
      const classCode = await generateCSharpClasses(
        'NamespaceName',
        'RootClass',
        workflowName,
        mockType,
        mockClassName,
        {
          body: {
            orderId: {
              nestedTypeProperty: 'string',
              title: 'orderId',
            },
            customerId: {
              nestedTypeProperty: 'string',
              title: 'customerId',
            },
            region: {
              nestedTypeProperty: 'string',
              title: 'region',
            },
            orderDetails: {
              '[*]': {
                productId: {
                  nestedTypeProperty: 'string',
                  title: 'productId',
                },
                productName: {
                  nestedTypeProperty: 'string',
                  title: 'productName',
                },
                quantity: {
                  nestedTypeProperty: 'integer',
                  title: 'quantity',
                },
                unitPrice: {
                  nestedTypeProperty: 'integer',
                  title: 'unitPrice',
                },
                nestedTypeProperty: 'object',
                title: 'Item',
              },
              nestedTypeProperty: 'array',
              title: 'orderDetails',
            },
            nestedTypeProperty: 'object',
            title: 'Body',
          },
          headers: {
            nestedTypeProperty: 'object',
            title: 'Headers',
          },
          relativePathParameters: {
            nestedTypeProperty: 'object',
            title: 'Path Parameters',
          },
          queries: {
            nestedTypeProperty: 'object',
            title: 'Queries',
          },
        },
        true
      );

      expect(classCode).toContain('public class RootClass');
      expect(classCode).toContain('public HttpStatusCode StatusCode {get; set;}');
      expect(classCode).toContain('public RootClassBody Body { get; set; }');

      expect(classCode).toContain('public RootClass()');
      expect(classCode).toContain('this.StatusCode = HttpStatusCode.OK;');
      expect(classCode).toContain('this.Body = new RootClassBody();');

      expect(classCode).toContain('public class RootClassBody');
      expect(classCode).toContain('public string OrderId { get; set; }');
      expect(classCode).toContain('public string CustomerId { get; set; }');
      expect(classCode).toContain('public string Region { get; set; }');
      expect(classCode).toContain('public List<OrderDetailsItem> OrderDetails { get; set; }');

      expect(classCode).toContain('public RootClassBody()');
      expect(classCode).toContain('this.OrderId = string.Empty;');
      expect(classCode).toContain('this.CustomerId = string.Empty;');
      expect(classCode).toContain('this.Region = string.Empty;');
      expect(classCode).toContain('this.OrderDetails = new List<OrderDetailsItem>();');

      expect(classCode).toContain('public class OrderDetailsItem');
      expect(classCode).toContain('public string ProductId { get; set; }');
      expect(classCode).toContain('public string ProductName { get; set; }');
      expect(classCode).toContain('public int Quantity { get; set; }');
      expect(classCode).toContain('public int UnitPrice { get; set; }');

      expect(classCode).toContain('public OrderDetailsItem()');
      expect(classCode).toContain('this.ProductId = string.Empty;');
      expect(classCode).toContain('this.ProductName = string.Empty;');
      expect(classCode).toContain('this.Quantity = 0;');
      expect(classCode).toContain('this.UnitPrice = 0;');
    });
  });

  describe('generateCSharpClasses - non HTTP', () => {
    let mockClassTemplateContent: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const mockClassTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testMockClassTemplateName);
      mockClassTemplateContent = await realFs.readFile(mockClassTemplatePath, 'utf8');
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('TestMockClass')) return mockClassTemplateContent;
        throw new Error(`File not found: ${p}`);
      });
    });

    it('should generate C# class code from a class definition non HTTP action', async () => {
      const workflowName = 'TestWorkflow';
      const mockType = 'Action';
      const mockClassName = 'MockClass';
      const classCode = await generateCSharpClasses(
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

    it('should not have StatusCode property from the generated class definition', async () => {
      // Simulate JSON output with a redundant StatusCode property.
      const dataWithStatusCode = {
        nestedTypeProperty: 'object',
        Body: { nestedTypeProperty: 'object', description: 'Response body' },
        StatusCode: { nestedTypeProperty: 'integer', description: 'The status code' },
      };

      const classCode = await generateCSharpClasses(
        'TestNamespace',
        'TestClass',
        'WorkflowName',
        'Action',
        'MockClass',
        dataWithStatusCode,
        false
      );

      // The generated code should include the constructor setting the base's StatusCode.
      expect(classCode).not.toContain('this.StatusCode = HttpStatusCode.OK;');
      // It should not contain a separate integer property for StatusCode in the class body.
      expect(classCode).not.toContain('public int StatusCode { get; set; }');
      // Optionally, check that other properties are still generated correctly.
      expect(classCode).toContain('public JObject Body { get; set; }');
    });

    it('should not remove properties other than StatusCode', async () => {
      const dataWithoutStatusCode = {
        nestedTypeProperty: 'object',
        Key1: { nestedTypeProperty: 'string', description: 'Test key description' },
      };

      const classCode = await generateCSharpClasses(
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
  });

  describe('generateCSharpClasses - Naming and Namespace Validation', () => {
    let mockClassTemplateContent: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const mockClassTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testMockClassTemplateName);
      mockClassTemplateContent = await realFs.readFile(mockClassTemplatePath, 'utf8');
    });

    beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('TestMockClass')) return mockClassTemplateContent;
        throw new Error(`File not found: ${p}`);
      });
    });

    it('should generate a C# class with a valid class name and namespace structure', async () => {
      const namespaceName = 'MyLogicApp';
      const rootClassName = 'SomeOperationMockOutput';
      const workflowName = 'TestWorkflow';
      const mockType = 'Action';
      const mockClassName = 'MockClass';
      const data = {
        nestedTypeProperty: 'object',
        key: { nestedTypeProperty: 'string', description: 'test key' },
      };
      const classCode = await generateCSharpClasses(namespaceName, rootClassName, workflowName, mockType, mockClassName, data, false);

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
      const classCode = generateMockOutputsClassContent(classDef, false);
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
      const classCode = generateMockOutputsClassContent(classDef, true);
      expect(classCode).toContain('public class TestClass');
      expect(classCode).toContain('public HttpStatusCode StatusCode {get; set;}');
      expect(classCode).toContain('public string Property1 { get; set; }');
      expect(classCode).toContain('public int Property2 { get; set; }');
      expect(classCode).toContain('public DateTime DTProperty { get; set; }');

      expect(classCode).toContain('this.StatusCode = HttpStatusCode.OK;');
      const setStatusCodeOccurrences = classCode.split('this.StatusCode = HttpStatusCode.OK;').length - 1;
      expect(setStatusCodeOccurrences).toBe(1);
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

      const classCode = generateMockOutputsClassContent(classDef);
      expect(classCode).toContain('public class ParentClass');
      expect(classCode).toContain('public ChildClass Child { get; set; }');
      const setChildOccurrences = classCode.split('this.Child = new ChildClass();').length - 1;
      expect(setChildOccurrences).toBe(1);
      expect(classCode).toContain('public class ChildClass');
      expect(classCode).toContain('public string NestedProperty { get; set; }');
      expect(classCode).toContain('this.NestedProperty = string.Empty;');
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

  describe('aom getOperationMockClassContent with triggers and actions', () => {
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

      await expect(
        getOperationMockClassContent(operationInfo, outputParameters, projectPath, 'workflowName', fakeLogicAppName)
      ).rejects.toThrowError();
    });

    it('should return mock action/trigger class contents for each operation in the workflow', async () => {
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
      const classDef = buildOutputsClassDefinition('RootClass', {
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
    const csprojFilePath: string = 'dummy.csproj';
    let writeFileSpy: any;
    let readFileSpy: any;
    let testCsprojFileTemplate: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const testCsprojFileTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testCsprojFileTemplateName);
      testCsprojFileTemplate = await realFs.readFile(testCsprojFileTemplatePath, 'utf8');
    });

    beforeEach(() => {
      vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
      readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testCsprojFileTemplate);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create a C# project file with the correct content', async () => {
      const pathExistsSpy = vi.spyOn(fse, 'pathExists').mockResolvedValue(false);

      await createCsprojFile(csprojFilePath);

      expect(pathExistsSpy).toHaveBeenCalledWith(csprojFilePath);
      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledWith(csprojFilePath, testCsprojFileTemplate);
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

      readFileSpy = vi
        .spyOn(fse, 'readFile')
        .mockImplementation((file, encoding, callback) => callback(null, xmlWithUnitTestSettingsConfig));
      writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();

      await updateCsprojFile(csprojFilePath, workflowName);

      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(ext.outputChannel.appendLog).toHaveBeenCalled();
    });

    it('should throw an error when reading the file fails', async () => {
      const csprojFilePath = 'dummy.csproj';
      const workflowName = 'MyWorkflow';
      const readError = new Error('read error');

      vi.spyOn(fse, 'readFile').mockImplementation(
        (file: string, encoding: string, callback: (err: Error | null, data?: string) => void) => {
          callback(readError, undefined);
        }
      );

      await expect(updateCsprojFile(csprojFilePath, workflowName)).rejects.toThrowError(readError);
    });

    it('should throw an error when parsing XML fails', async () => {
      const csprojFilePath = 'dummy.csproj';
      const workflowName = 'MyWorkflow';
      const invalidXml = `<Project></Project`;

      vi.spyOn(fse, 'readFile').mockImplementation(
        (file: string, encoding: string, callback: (err: Error | null, data?: string) => void) => {
          callback(null, invalidXml);
        }
      );

      await expect(updateCsprojFile(csprojFilePath, workflowName)).rejects.toThrowError();
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
    let testClassFileTemplate: string;
    let testClassFileFromRunTemplate: string;
    let testClassFileNoActionsTemplate: string;
    let testClassFileFromRunNoActionsTemplate: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);

      const testClassFileTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testClassFileTemplateName);
      testClassFileTemplate = await realFs.readFile(testClassFileTemplatePath, 'utf8');

      const testClassFileFromRunTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testClassFileFromRunTemplateName);
      testClassFileFromRunTemplate = await realFs.readFile(testClassFileFromRunTemplatePath, 'utf8');

      const testClassFileNoActionsTemplatePath = path.join(
        assetsFolderPath,
        unitTestTemplatesFolderName,
        testClassFileNoActionsTemplateName
      );
      testClassFileNoActionsTemplate = await realFs.readFile(testClassFileNoActionsTemplatePath, 'utf8');

      const testClassFileFromRunNoActionsTemplatePath = path.join(
        assetsFolderPath,
        unitTestTemplatesFolderName,
        testClassFileFromRunNoActionsTemplateName
      );
      testClassFileFromRunNoActionsTemplate = await realFs.readFile(testClassFileFromRunNoActionsTemplatePath, 'utf8');
    });

    beforeEach(() => {
      vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSpy = vi.spyOn(fse, 'writeFile').mockResolvedValue();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create a C# file using the TestClassFile template when creating from scratch', async () => {
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
        cleanedLogicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName,
        true
      );

      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
      expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
      expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`var triggerMockOutput = new ${triggerOutputClassName}();`));
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`var triggerMock = new ${triggerMockClassName}(outputs: triggerMockOutput);`)
      );
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`)
      );
      expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`namespace ${cleanedLogicAppName}.Tests`));
      expect(writeFileSpyCalledWith[1]).toEqual(expect.stringContaining(`var actionMockOutput = new ${actionOutputClassName}();`));
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`var actionMock = new ${actionMockClassName}(name: "${actionName}", outputs: actionMockOutput);`)
      );
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`public ${actionMockClassName} ${actionMockClassName}OutputCallback(TestExecutionContext context)`)
      );
    });

    it('should create a C# file using the TestClassFileFromRun template when creating from run', async () => {
      const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testClassFileFromRunTemplate);

      const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
      const cleanedWorkflowName = workflowName.replace(/-/g, '_');
      const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

      await createTestCsFile(
        unitTestFolderPath,
        unitTestName,
        cleanedUnitTestName,
        workflowName,
        cleanedWorkflowName,
        cleanedLogicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName,
        false
      );

      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
      expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`)
      );
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

    it('should create a C# file using the TestClassFileNoActions template when creating from scratch using a workflow without actions', async () => {
      const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testClassFileNoActionsTemplate);

      const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
      const cleanedWorkflowName = workflowName.replace(/-/g, '_');
      const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

      await createTestCsFile(
        unitTestFolderPath,
        unitTestName,
        cleanedUnitTestName,
        workflowName,
        cleanedWorkflowName,
        cleanedLogicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName,
        true
      );

      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
      expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`)
      );
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

    it('should create a C# file using the TestClassFileFromRunNoActions template when creating from run using a workflow without actions', async () => {
      const readFileSpy = vi.spyOn(fse, 'readFile').mockResolvedValue(testClassFileFromRunNoActionsTemplate);

      const cleanedUnitTestName = unitTestName.replace(/-/g, '_');
      const cleanedWorkflowName = workflowName.replace(/-/g, '_');
      const cleanedLogicAppName = logicAppName.replace(/-/g, '_');

      await createTestCsFile(
        unitTestFolderPath,
        unitTestName,
        cleanedUnitTestName,
        workflowName,
        cleanedWorkflowName,
        cleanedLogicAppName,
        actionName,
        actionOutputClassName,
        actionMockClassName,
        triggerOutputClassName,
        triggerMockClassName,
        false
      );

      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      const writeFileSpyCalledWith = writeFileSpy.mock.calls[writeFileSpy.mock.calls.length - 1];
      expect(writeFileSpyCalledWith[0]).toEqual(path.join(unitTestFolderPath, `${unitTestName}.cs`));
      expect(writeFileSpyCalledWith[1]).toEqual(
        expect.stringContaining(`using ${cleanedLogicAppName}.Tests.Mocks.${cleanedWorkflowName};`)
      );
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
    const logicAppName: string = 'My-LogicApp';
    const unitTestFolderPath: string = 'unitTestFolderPath';
    let readFileSpy: any;
    let writeFileSpy: any;
    let testExecutorFileTemplate: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const testExecutorFileTemplatePath = path.join(assetsFolderPath, unitTestTemplatesFolderName, testExecutorFileTemplateName);
      testExecutorFileTemplate = await realFs.readFile(testExecutorFileTemplatePath, 'utf8');
    });

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
    const unitTestFolderPath: string = 'unitTestFolderPath';
    const logicAppName: string = 'MyLogicApp';
    const workflowName: string = 'MyWorkflow';
    let readFileSpy: any;
    let writeFileSpy: any;
    let testSettingsConfigFileTemplate: string;

    beforeAll(async () => {
      const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
      const rootDir = path.join(__dirname, '..', '..', '..', '..');
      const assetsFolderPath = path.join(rootDir, assetsFolderName);
      const testSettingsConfigFileTemplatePath = path.join(
        assetsFolderPath,
        unitTestTemplatesFolderName,
        testSettingsConfigFileTemplateName
      );
      testSettingsConfigFileTemplate = await realFs.readFile(testSettingsConfigFileTemplatePath, 'utf8');
    });

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
      expect(() => validateWorkflowPath(projectPath, invalidWorkflowPath)).toThrowError(
        "doesn't belong to the Logic Apps Standard Project"
      );
    });

    it('should not throw an error if the workflow node is valid', () => {
      const validWorkflowPath = path.join(projectPath, fakeLogicAppName, 'workflow1', 'workflow.json');
      expect(() => validateWorkflowPath(projectPath, validWorkflowPath)).not.toThrowError();
    });
  });
});
