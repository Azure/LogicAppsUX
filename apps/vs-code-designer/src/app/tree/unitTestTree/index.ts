/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { unitTestExplorer } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { hasLogicAppProject } from '../../utils/workspace';
import { TestFile } from './testFile';
import { TestWorkflow } from './testWorkflow';
import { TestWorkspace } from './testWorkspace';
import { isEmptyString } from '@microsoft/utils-logic-apps';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import {
  RelativePattern,
  type TestController,
  workspace,
  Uri,
  type CancellationToken,
  type TestRunRequest,
  type EventEmitter,
  type TestItem,
  type ExtensionContext,
  type TestItemCollection,
  tests,
  TestRunProfileKind,
} from 'vscode';

export type TestData = TestWorkspace | TestWorkflow | TestFile;

/**
 * Prepares the test explorer for unit tests.
 * @param {ExtensionContext} context - The extension context.
 * @param {IActionContext} activateContext - Command activate context.
 */
export const prepareTestExplorer = async (context: ExtensionContext, activateContext: IActionContext) => {
  callWithTelemetryAndErrorHandling(unitTestExplorer, async (actionContext: IActionContext) => {
    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
      const isLogicAppProject = await hasLogicAppProject(actionContext);

      if (isLogicAppProject) {
        // Unit tests controller
        const unitTestController = tests.createTestController('LogicAppStandardTests', 'Logic App Standard Tests');
        context.subscriptions.push(unitTestController);
        ext.unitTestController = unitTestController;

        // Refresh handler when click in refresh button in the test explorer
        unitTestController.refreshHandler = async () => {
          await updateTestTree(unitTestController);
        };

        // Run profile when click in run button in the test explorer
        unitTestController.createRunProfile(
          'Run logic apps standard unit tests',
          TestRunProfileKind.Run,
          (request, cancellation) => runHandler(request, cancellation, unitTestController, activateContext),
          true,
          undefined
        );

        // Handler to load unit test folders and files when load the test explorer
        unitTestController.resolveHandler = async (item: TestItem) => unitTestResolveHandler(context, unitTestController, item);
      }
    }
  });
};

/**
 * Retrieves the test files asynchronously.
 * @param {TestController} controller The test controller.
 * @returns A promise that resolves to an array of test files.
 */
export const updateTestTree = async (controller: TestController) => {
  await Promise.all(getWorkspaceTestPatterns().map(({ pattern }) => findInitialFiles(controller, pattern)));
};

/**
 * Retrieves the workspace test patterns.
 * @returns An array of workspace test patterns.
 */
export const getWorkspaceTestPatterns = () => {
  if (!workspace.workspaceFolders) {
    return [];
  }

  return workspace.workspaceFolders.map((workspaceFolder) => ({
    workspaceFolder,
    pattern: new RelativePattern(workspaceFolder, '**/*.unit-test.json'),
  }));
};

/**
 * Runs the test handler based on the provided request and cancellation token.
 * @param {TestRunRequest} request - The test run request.
 * @param {CancellationToken} cancellation - The cancellation token.
 * @param {IActionContext} activateContext - Command activate context.
 */
export const runHandler = (
  request: TestRunRequest,
  cancellation: CancellationToken,
  unitTestController: TestController,
  activateContext: IActionContext
) => {
  cancellation.onCancellationRequested(() => request.include.forEach((item) => ext.watchingTests.delete(item)));
  return startTestRun(request, unitTestController, activateContext);
};

/**
 * Handles and resolves the unit test folders and files.
 * @param {ExtensionContext} context - The context object.
 * @param {TestController} ctrl - The control object.
 * @param {TestItem} item - The test item.
 */
export const unitTestResolveHandler = async (context: ExtensionContext, ctrl: TestController, item: TestItem) => {
  if (!item) {
    context.subscriptions.push(...testsWorkspaceWatcher(ctrl, ext.testFileChangedEmitter));
    return;
  }

  const data = ext.testData.get(item);
  if (data instanceof TestWorkspace || data instanceof TestWorkflow) {
    if (!data.hasChildren()) {
      await data.createChild(ctrl);
    }
  }
};

/**
 * Creates and returns an array of file system watchers for the specified test patterns in the workspace.
 * Whenever a file is created, changed, or deleted, the corresponding actions are performed and the fileChangedEmitter is fired.
 * @param {TestController} controller - The test controller to associate the file system watchers with.
 * @param {EventEmitter<Uri>} fileChangedEmitter - The event emitter to notify when a file is created, changed, or deleted.
 * @returns An array of file system watchers.
 */
const testsWorkspaceWatcher = (controller: TestController, fileChangedEmitter: EventEmitter<Uri>) => {
  return getWorkspaceTestPatterns().map(({ pattern }) => {
    const watcher = workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate((uri) => {
      getOrCreateFile(controller, uri);
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidChange(async (uri) => {
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidDelete((uri) => controller.items.delete(uri.toString()));

    findInitialFiles(controller, pattern);

    return watcher;
  });
};

/**
 * Finds initial files based on the provided pattern and creates a test file on each file.
 * @param {TestController} controller The test controller.
 * @param {GlobPattern} pattern The glob pattern used to find files.
 */
const findInitialFiles = async (controller: TestController, pattern: RelativePattern) => {
  const unitTestFiles = await workspace.findFiles(pattern);

  const workspacesTestFiles = unitTestFiles.reduce((acc, file: Uri) => {
    const workspaceName = file.fsPath.split('/').slice(-5)[0];

    if (!acc[workspaceName]) {
      acc[workspaceName] = [];
    }
    acc[workspaceName].push(file);
    return acc;
  }, {});

  for (const workspace of Object.keys(workspacesTestFiles)) {
    getOrCreateWorkspace(controller, workspace, workspacesTestFiles[workspace]);
  }
};

/**
 * Gets or creates a workspace for unit testing.
 * @param {TestController} controller - The test controller.
 * @param {string} workspaceName - The name of the workspace.
 * @param {Uri[]} files - An array of URIs representing the files in the workspace.
 * @returns An object containing the workspace test item and its associated data.
 */
const getOrCreateWorkspace = (controller: TestController, workspaceName: string, files: Uri[]) => {
  const existing = controller.items.get(workspaceName);
  if (existing) {
    return { file: existing, data: ext.testData.get(existing) as TestWorkspace };
  }
  const filePath = files.length > 0 ? files[0].fsPath : '';
  const workspaceUri = isEmptyString(filePath) ? undefined : Uri.file(filePath.split('/').slice(0, -4).join('/'));

  const workspaceTestItem = controller.createTestItem(workspaceName, workspaceName, workspaceUri);
  controller.items.add(workspaceTestItem);

  const data = new TestWorkspace(workspaceName, files, workspaceTestItem);
  ext.testData.set(workspaceTestItem, data);

  workspaceTestItem.canResolveChildren = true;
  return { workspaceTestItem, data };
};

/**
 * Retrieves an existing file test or creates a new one based on the provided URI.
 * @param {TestController} controller - The test controller.
 * @param {Uri} uri - The URI of the file.
 * @returns An object containing the file test and its associated data, if it exists.
 */
const getOrCreateFile = async (controller: TestController, uri: Uri) => {
  const workspaceName = uri.fsPath.split('/').slice(-5)[0];
  const testName = path.basename(uri.fsPath);
  const workflowName = path.basename(path.dirname(uri.fsPath));

  const existingWorkspaceTest = controller.items.get(workspaceName);

  if (existingWorkspaceTest) {
    const existingWorkflowTest = existingWorkspaceTest.children.get(`${workspaceName}/${workflowName}`);

    if (existingWorkflowTest) {
      const existingFileTest = existingWorkflowTest.children.get(`${workspaceName}/${workflowName}/${testName}`);
      return { file: existingFileTest, data: ext.testData.get(existingFileTest) as TestFile };
    } else {
      const workflowTestItem = controller.createTestItem(`${workspaceName}/${workflowName}`, workflowName, uri);
      workflowTestItem.canResolveChildren = true;
      controller.items.add(workflowTestItem);

      const testWorkflow = new TestWorkflow(`${workspaceName}/${workflowName}`, [uri], workflowTestItem);
      testWorkflow.createChild(controller);
      ext.testData.set(workflowTestItem, testWorkflow);
      existingWorkspaceTest.children.add(workflowTestItem);
    }
  } else {
    const workspaceUri = Uri.file(uri.fsPath.split('/').slice(0, -4).join('/'));
    const workspaceTestItem = controller.createTestItem(workspaceName, workspaceName, workspaceUri);
    workspaceTestItem.canResolveChildren = true;
    controller.items.add(workspaceTestItem);

    const testWorkspace = new TestWorkspace(workspaceName, [uri], workspaceTestItem);
    testWorkspace.createChild(controller);
    ext.testData.set(workspaceTestItem, testWorkspace);
  }

  return {};
};

/**
 * Starts a test run based on the provided request and unit test controller.
 * @param {TestRunRequest} request - The test run request.
 * @param {TestController} unitTestController - The unit test controller.
 * @param {IActionContext} activateContext - Command activate context.
 */
const startTestRun = (request: TestRunRequest, unitTestController: TestController, activateContext: IActionContext) => {
  const queue: { test: TestItem; data: TestFile }[] = [];
  const run = unitTestController.createTestRun(request, localize('runLogicApps', 'Run logic apps standard'), true);

  /**
   * Discovers tests recursively and enqueues them for execution.
   * @param {Iterable<TestItem>} tests - An iterable of TestItem objects representing the tests to discover.
   */
  const discoverTests = async (tests: Iterable<TestItem>) => {
    for (const test of tests) {
      if (request.exclude?.includes(test)) {
        continue;
      }

      const data = ext.testData.get(test);
      if (data instanceof TestFile) {
        run.enqueued(test);
        queue.push({ test, data });
      } else {
        if (data instanceof TestWorkflow || data instanceof TestWorkspace) {
          if (test.children.size === 0) {
            await data.createChild(unitTestController);
          }
        }

        await discoverTests(gatherTestItems(test.children));
      }
    }
  };

  /**
   * Runs the test queue asynchronously.
   */
  const runTestQueue = async () => {
    for (const { test, data } of queue) {
      run.appendOutput(`Running ${test.label}\r\n`);
      if (run.token.isCancellationRequested) {
        run.skipped(test);
      } else {
        run.started(test);
        await data.run(test, run, activateContext);
      }

      run.appendOutput(`Completed ${test.label}\r\n`);
    }

    run.end();
  };

  discoverTests(request.include ?? gatherTestItems(unitTestController.items)).then(runTestQueue);
};

/**
 * Gathers all the test items from a TestItemCollection.
 * @param {TestItemCollection} collection - The TestItemCollection to gather the test items from.
 * @returns An array of TestItem objects.
 */
const gatherTestItems = (collection: TestItemCollection) => {
  const items: TestItem[] = [];
  collection.forEach((item: TestItem) => items.push(item));

  return items;
};
