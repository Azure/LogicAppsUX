import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import * as childProcess from 'child_process';
import { saveBlankUnitTest } from '../saveBlankUnitTest';
import * as workspaceUtils from '../../../../utils/workspace';
import * as projectRootUtils from '../../../../utils/verifyIsProject';
import * as unitTestUtils from '../../../../utils/unitTests/codefulUnitTests';
import * as azextUtils from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../../extensionVariables';
import * as ConvertWorkspace from '../../../convertToWorkspace';
import * as syncCloudSettings from '../../../syncCloudSettings';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { testMockOutputsDirectory, testsDirectoryName } from '../../../../../constants';

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('saveBlankUnitTest', () => {
  let dummyContext: IActionContext;
  const dummyNode: vscode.Uri = vscode.Uri.file('/dummy/path/to/workflow.json');
  const dummyUnitTestDefinition = {
    operationInfo: { some: 'info' },
    outputParameters: { param: 'value' },
  };
  const dummyWorkspaceFolder: vscode.WorkspaceFolder = {
    uri: vscode.Uri.file('/fake/workspace'),
    name: 'fakeWorkspace',
    index: 0,
  };
  const dummyProjectPath = '/dummy/project';
  const dummyWorkflowNodeUri = vscode.Uri.file('/dummy/workflow/node.json');
  const dummyUnitTestName = 'MyUnitTest';
  const dummyWorkflowName = 'Workflow1';
  const dummyUnitTestFolderPath = '/dummy/project/tests/Workflow1/MyUnitTest';

  const dummyPaths = {
    unitTestFolderPath: dummyUnitTestFolderPath,
    logicAppName: 'LogicApp1',
    logicAppTestFolderPath: '/fake/project/myLogicApp',
    workflowTestFolderPath: path.join(dummyProjectPath, 'workflows', dummyWorkflowName),
    mocksFolderPath: path.join(dummyProjectPath, 'workflows', dummyWorkflowName, testMockOutputsDirectory),
    testsDirectory: path.join(dummyProjectPath, testsDirectoryName),
  };

  const dummyMockOperations: {
    mockClassContent: Record<string, string>;
    foundActionMocks: Record<string, string>;
    foundTriggerMocks: Record<string, string>;
  } = {
    mockClassContent: {
      TestOperationTriggerOutput: 'dummy class content',
    },
    foundActionMocks: {},
    foundTriggerMocks: {
      Test_operation: 'TestOperationTriggerOutput',
    },
  };

  let updateSolutionWithProjectSpy: any;

  beforeEach(() => {
    dummyContext = {
      telemetry: { properties: {} },
    } as IActionContext;

    // Stub utility functions used in saveBlankUnitTest
    vi.spyOn(workspaceUtils, 'getWorkspacePath').mockResolvedValue(dummyWorkspaceFolder.uri.fsPath);
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(dummyWorkspaceFolder);
    vi.spyOn(projectRootUtils, 'tryGetLogicAppProjectRoot').mockResolvedValue(dummyProjectPath);
    vi.spyOn(unitTestUtils, 'parseUnitTestOutputs').mockResolvedValue({} as any);
    vi.spyOn(unitTestUtils, 'selectWorkflowNode').mockResolvedValue(dummyWorkflowNodeUri);
    vi.spyOn(unitTestUtils, 'promptForUnitTestName').mockResolvedValue(dummyUnitTestName);
    vi.spyOn(unitTestUtils, 'validateWorkflowPath').mockResolvedValue();
    vi.spyOn(unitTestUtils, 'getUnitTestPaths').mockReturnValue(dummyPaths);
    vi.spyOn(unitTestUtils, 'getOperationMockClassContent').mockResolvedValue(dummyMockOperations);
    vi.spyOn(syncCloudSettings, 'syncCloudSettings').mockResolvedValue();

    // Stub directory creation
    vi.spyOn(fs, 'ensureDir').mockResolvedValue();

    // Stub isMultiRootWorkspace to simulate a valid multi-root environment
    vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(true);
    vi.spyOn(ConvertWorkspace, 'convertToWorkspace').mockResolvedValue(true);

    // Stub the callWithTelemetryAndErrorHandling wrapper used inside saveBlankUnitTest
    vi.spyOn(azextUtils, 'callWithTelemetryAndErrorHandling').mockImplementation(async (eventName, callback) => {
      // Directly call the callback passed in to simulate success
      await callback(dummyContext);
    });

    // Stub methods used within generateBlankCodefulUnitTest
    vi.spyOn(unitTestUtils, 'createTestCsFile').mockResolvedValue();
    vi.spyOn(unitTestUtils, 'ensureCsproj').mockResolvedValue();
    vi.spyOn(workspaceUtils, 'ensureDirectoryInWorkspace').mockResolvedValue();
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});

    // Stub the methods used in updateSolutionWithProject
    updateSolutionWithProjectSpy = vi.spyOn(unitTestUtils, 'updateTestsSln');
    vi.spyOn(util, 'promisify').mockImplementation((fn) => fn);
    vi.spyOn(childProcess, 'exec').mockResolvedValue(new childProcess.ChildProcess());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should successfully create a blank unit test', async () => {
    await saveBlankUnitTest(dummyNode, dummyUnitTestDefinition);

    expect(dummyContext.telemetry.properties.unitTestSaveStatus).toBe('Success');
    expect(unitTestUtils.promptForUnitTestName).toHaveBeenCalledTimes(1);
    expect(fs.ensureDir).toHaveBeenCalled();

    expect(updateSolutionWithProjectSpy).toHaveBeenCalledOnce();
    expect(updateSolutionWithProjectSpy).not.toThrowError();
    expect(dummyContext.telemetry.properties.result).toBe('Succeeded');
    expect(dummyContext.telemetry.properties.lastStep).toBe('syncCloudSettings');
  });

  test('should not continue if not a valid workspace', async () => {
    vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(false);
    vi.spyOn(ConvertWorkspace, 'convertToWorkspace').mockResolvedValue(false);

    await saveBlankUnitTest(dummyNode, dummyUnitTestDefinition);

    expect(unitTestUtils.promptForUnitTestName).toHaveBeenCalledTimes(0);
    expect(dummyContext.telemetry.properties.multiRootWorkspaceValid).toBe('false');
    expect(updateSolutionWithProjectSpy).not.toHaveBeenCalled();
    expect(dummyContext.telemetry.properties.result).toBe('Canceled');
  });

  test('should log an error and call handleError when an exception occurs', async () => {
    const testError = new Error('Test error');
    vi.spyOn(unitTestUtils, 'parseUnitTestOutputs').mockRejectedValueOnce(testError);

    await saveBlankUnitTest(dummyNode, dummyUnitTestDefinition);

    expect(updateSolutionWithProjectSpy).not.toHaveBeenCalled();
    expect(dummyContext.telemetry.properties.result).toBe('Failed');
    expect(dummyContext.telemetry.properties.errorMessage).toBeDefined();
  });
});
