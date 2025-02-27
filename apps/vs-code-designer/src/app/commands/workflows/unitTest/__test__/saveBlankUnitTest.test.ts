// saveBlankUnitTest.test.ts
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

// Import the function under test and the utility modules
import { saveBlankUnitTest } from '../saveBlankUnitTest';
import * as workspaceUtils from '../../../../utils/workspace';
import * as projectRootUtils from '../../../../utils/verifyIsProject';
import * as unitTestUtils from '../../../../utils/unitTests';
import * as azextUtils from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../../extensionVariables';
import * as convertWorkspace from '../../../../commands/createNewCodeProject/CodeProjectBase/ConvertToWorkspace';

vi.mock('../../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('saveBlankUnitTest', () => {
  const dummyContext: any = { telemetry: {} };
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
    testsDirectory: path.join(dummyProjectPath, 'tests'),
  };

  const dummyMockOperations: { foundActionMocks: Record<string, string>; foundTriggerMocks: Record<string, string> } = {
    foundActionMocks: {},
    foundTriggerMocks: {},
  };

  beforeEach(() => {
    // Stub utility functions used in saveBlankUnitTest
    vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(dummyWorkspaceFolder);
    vi.spyOn(projectRootUtils, 'tryGetLogicAppProjectRoot').mockResolvedValue(dummyProjectPath);
    vi.spyOn(unitTestUtils, 'parseUnitTestOutputs').mockResolvedValue({} as any);
    vi.spyOn(unitTestUtils, 'selectWorkflowNode').mockResolvedValue(dummyWorkflowNodeUri);
    vi.spyOn(unitTestUtils, 'promptForUnitTestName').mockResolvedValue(dummyUnitTestName);
    vi.spyOn(unitTestUtils, 'getUnitTestPaths').mockReturnValue(dummyPaths);
    vi.spyOn(unitTestUtils, 'processAndWriteMockableOperations').mockResolvedValue(dummyMockOperations);

    // Stub directory creation
    vi.spyOn(fs, 'ensureDir').mockResolvedValue();

    // Stub telemetry logging functions
    vi.spyOn(unitTestUtils, 'logTelemetry').mockImplementation(() => {});
    vi.spyOn(unitTestUtils, 'handleError').mockImplementation((context, error, source) => {
      throw error;
    });
    vi.spyOn(unitTestUtils, 'logError').mockImplementation(() => {});
    vi.spyOn(unitTestUtils, 'logSuccess').mockImplementation(() => {});

    // Stub isMultiRootWorkspace to simulate a valid multi-root environment
    vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(true);
    vi.spyOn(convertWorkspace, 'ConvertToWorkspace').mockResolvedValue(true);

    // Stub the callWithTelemetryAndErrorHandling wrapper used inside saveBlankUnitTest
    vi.spyOn(azextUtils, 'callWithTelemetryAndErrorHandling').mockImplementation(async (eventName, callback) => {
      // Directly call the callback passed in to simulate success
      await callback(dummyContext);
    });

    // Stub methods used within generateBlankCodefulUnitTest
    vi.spyOn(unitTestUtils, 'createCsFile').mockResolvedValue();
    vi.spyOn(unitTestUtils, 'ensureCsproj').mockResolvedValue();
    vi.spyOn(workspaceUtils, 'ensureDirectoryInWorkspace').mockResolvedValue();
    vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should successfully create a blank unit test', async () => {
    await saveBlankUnitTest(dummyContext, dummyNode, dummyUnitTestDefinition);

    // Verify that telemetry was logged indicating a successful process
    expect(unitTestUtils.logTelemetry).toHaveBeenCalledWith(dummyContext, expect.objectContaining({ unitTestSaveStatus: 'Success' }));
    // Verify that the unit test name was prompted
    expect(unitTestUtils.promptForUnitTestName).toHaveBeenCalledTimes(1);
    // Verify that required directories were ensured to exist
    expect(fs.ensureDir).toHaveBeenCalled();
    // Verify that the backend process was invoked via callWithTelemetryAndErrorHandling
    expect(azextUtils.callWithTelemetryAndErrorHandling).toHaveBeenCalled();
  });

  test('should not continue if not a valid workspace', async () => {
    vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(false);
    vi.spyOn(convertWorkspace, 'ConvertToWorkspace').mockResolvedValue(false);

    await saveBlankUnitTest(dummyContext, dummyNode, dummyUnitTestDefinition);
    expect(unitTestUtils.promptForUnitTestName).toHaveBeenCalledTimes(0);
    expect(unitTestUtils.logTelemetry).toHaveBeenCalledWith(dummyContext, expect.objectContaining({ multiRootWorkspaceValid: 'false' }));
  });

  test('should log an error and call handleError when an exception occurs', async () => {
    const testError = new Error('Test error');
    vi.spyOn(unitTestUtils, 'parseUnitTestOutputs').mockRejectedValueOnce(testError);

    await expect(saveBlankUnitTest(dummyContext, dummyNode, dummyUnitTestDefinition)).rejects.toThrow('Test error');

    // Verify that the error logging function was called
    expect(unitTestUtils.handleError).toHaveBeenCalled();
  });
});
