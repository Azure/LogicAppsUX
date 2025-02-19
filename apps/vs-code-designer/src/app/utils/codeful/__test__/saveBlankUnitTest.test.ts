import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';
import * as workspaceUtils from '../../../utils/workspace';
import * as projectUtils from '../../../utils/verifyIsProject';
import * as unitTestUtils from '../../../utils/unitTests';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { saveBlankUnitTest } from '../../../commands/workflows/unitTest/saveBlankUnitTest';
import { RemoteWorkflowTreeItem } from '../../../tree/remoteWorkflowsTree/RemoteWorkflowTreeItem';
import * as localize from '../../../../localize';

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(() => Promise.resolve()),
}));

// -----------------------------------------------------------------------------
// Global Test Data and Helper Stubs
// -----------------------------------------------------------------------------

// Create a fake context that conforms to IAzureConnectorsContext.
const fakeContext: any = {
  telemetry: { properties: {} },
  ui: { showQuickPick: vi.fn() },
};

// Fake workspace folder and project paths.
const fakeWorkspaceFolder: vscode.WorkspaceFolder = {
  uri: vscode.Uri.file('/fake/workspace'),
  name: 'fakeWorkspace',
  index: 0,
};
const fakeProjectPath = '/fake/project';

// Fake workflow node URI.
const fakeWorkflowNode = vscode.Uri.file('/fake/project/workflows/myWorkflow/workflowFile');

// Dummy unit test definition that has at least operationInfo and outputParameters.
const fakeUnitTestDefinition = {
  operationInfo: { dummyOp: { type: 'Http' } },
  outputParameters: {
    dummyOp: {
      outputs: { 'outputs.$.dummy': { type: 'string', description: 'dummy description' } },
    },
  },
};

// Dummy paths returned by getUnitTestPaths.
const fakePaths = {
  unitTestFolderPath: '/fake/project/tests/myUnitTest',
  logicAppName: 'MyLogicApp',
  logicAppFolderPath: '/fake/project/myLogicApp',
  workflowFolderPath: '/fake/project/tests/myWorkflow',
  testsDirectory: '/fake/project/tests',
};

// -----------------------------------------------------------------------------
// Stub Implementations for Dependencies
// -----------------------------------------------------------------------------

beforeEach(() => {
  // Stub getWorkspaceFolder to return our fake workspace.
  vi.spyOn(workspaceUtils, 'getWorkspaceFolder').mockResolvedValue(fakeWorkspaceFolder);

  // Stub tryGetLogicAppProjectRoot to return our fake project path.
  vi.spyOn(projectUtils, 'tryGetLogicAppProjectRoot').mockResolvedValue(fakeProjectPath);

  // Stub getWorkflowNode so that if a node is provided, it returns it.
  vi.spyOn(workspaceUtils, 'getWorkflowNode').mockImplementation((node: vscode.Uri | RemoteWorkflowTreeItem | undefined) => {
    if (node instanceof vscode.Uri) {
      return node;
    }
    return fakeWorkflowNode;
  });

  // Stub selectWorkflowNode to return our fake workflow node.
  vi.spyOn(unitTestUtils, 'selectWorkflowNode').mockResolvedValue(fakeWorkflowNode);

  // Stub promptForUnitTestName to return a fake unit test name.
  vi.spyOn(unitTestUtils, 'promptForUnitTestName').mockResolvedValue('myUnitTest');

  // Stub getUnitTestPaths to return our fake paths.
  vi.spyOn(unitTestUtils, 'getUnitTestPaths').mockReturnValue(fakePaths);

  // Stub processUnitTestDefinition to resolve.
  vi.spyOn(unitTestUtils, 'processUnitTestDefinition').mockResolvedValue(undefined);

  // Stub logTelemetry (we can track telemetry separately if needed).
  vi.spyOn(unitTestUtils, 'logTelemetry').mockImplementation(() => {});

  // Note: callWithTelemetryAndErrorHandling is already provided by our partial mock above.

  // Stub isMultiRootWorkspace to return true by default.
  vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(true);

  (fs.ensureDir as unknown as Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// -----------------------------------------------------------------------------
// Test Suite for saveBlankUnitTest
// -----------------------------------------------------------------------------

describe('saveBlankUnitTest', () => {
  it('should throw an error if multi-root workspace is not valid', async () => {
    // Arrange: Stub isMultiRootWorkspace to return false.
    vi.spyOn(workspaceUtils, 'isMultiRootWorkspace').mockReturnValue(false);
    // Also stub localize to return its message.
    vi.spyOn(unitTestUtils, 'logTelemetry').mockImplementation(() => {});
    const expectedMessage =
      'A multi-root workspace must be open to create unit tests. Please use the "Create New Logic App Workspace" command.';
    vi.spyOn(localize, 'localize').mockReturnValue(expectedMessage);
    // Spy on ext.outputChannel.appendLog.
    const appendLogSpy = vi.spyOn(ext.outputChannel, 'appendLog');

    // Act & Assert: Expect the promise to reject with the error message.
    await expect(saveBlankUnitTest(fakeContext, undefined, fakeUnitTestDefinition)).rejects.toThrow(expectedMessage);
    expect(appendLogSpy).toHaveBeenCalledWith(expectedMessage);
  });

  it('should successfully save a blank unit test when all dependencies succeed', async () => {
    const showInfoSpy = vi
      .spyOn(vscode.window, 'showInformationMessage')
      .mockImplementation((_message: string, _options?: any): Thenable<vscode.MessageItem | undefined> => Promise.resolve({ title: 'OK' }));

    // Act: Call the function.
    await saveBlankUnitTest(fakeContext, fakeWorkflowNode, fakeUnitTestDefinition);
    expect(showInfoSpy).toHaveBeenCalledWith(expect.stringContaining('Generated unit test "myUnitTest" in'));
  });

  it('should handle errors and call handleError if an error is thrown during processing', async () => {
    const errorMessage = 'Prompt error';
    vi.spyOn(unitTestUtils, 'promptForUnitTestName').mockRejectedValue(new Error(errorMessage));
    // Spy on handleError.
    const handleErrorSpy = vi.spyOn(unitTestUtils, 'handleError').mockImplementation(() => {});
    // Act: Call the function.
    await saveBlankUnitTest(fakeContext, fakeWorkflowNode, fakeUnitTestDefinition);
    // Assert: Check that handleError was called with the error and source 'saveBlankUnitTest'
    expect(handleErrorSpy).toHaveBeenCalled();
    const calledArgs = handleErrorSpy.mock.calls[0];
    expect(calledArgs[2]).toBe('saveBlankUnitTest');
    expect((calledArgs[1] as Error).message).toBe(errorMessage);
  });
});
