/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { TestFile } from './testFile';
import { TestWorkflow } from './testWorkflow';
import { TestWorkspace } from './testWorkspace';
import { isEmptyString } from '@microsoft/utils-logic-apps';
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
} from 'vscode';

export type TestData = TestWorkspace | TestWorkflow | TestFile;

/**
 * Retrieves the test files asynchronously.
 * @param {TestController} controller The test controller.
 * @returns A promise that resolves to an array of test files.
 */
export const getTestFiles = async (controller: TestController) => {
  return await Promise.all(getWorkspaceTestPatterns().map(({ pattern }) => findInitialFiles(controller, pattern)));
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
 */
export const runHandler = (request: TestRunRequest, cancellation: CancellationToken, unitTestController: TestController) => {
  cancellation.onCancellationRequested(() => request.include.forEach((item) => ext.watchingTests.delete(item)));
  return startTestRun(request, unitTestController);
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
    await data.createChild(ctrl);
  }
};

const testsWorkspaceWatcher = (controller: TestController, fileChangedEmitter: EventEmitter<Uri>) => {
  return getWorkspaceTestPatterns().map(({ pattern }) => {
    const watcher = workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate((uri) => {
      // getOrCreateFile(controller, uri);
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidChange(async (_uri) => {
      // const { file, data } = getOrCreateFile(controller, uri);
      // if (data.didResolve) {
      //   await data.updateFromDisk(controller, file);
      // }
      // fileChangedEmitter.fire(uri);
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
    const workspaceName = file.path.split('/').slice(-5)[0];

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
    return { file: existing, data: ext.testData.get(existing) as TestFile };
  }
  const filePath = files.length > 0 ? files[0].path : '';
  const workspaceUri = isEmptyString(filePath) ? undefined : Uri.file(filePath.split('/').slice(0, -4).join('/'));

  const workspaceTestItem = controller.createTestItem(workspaceName, workspaceName, workspaceUri);
  controller.items.add(workspaceTestItem);

  const data = new TestWorkspace(workspaceName, files, workspaceTestItem);
  ext.testData.set(workspaceTestItem, data);

  workspaceTestItem.canResolveChildren = true;
  return { workspaceTestItem, data };
};

const startTestRun = (request: TestRunRequest, unitTestController: TestController) => {
  const queue: { test: TestItem; data: TestFile }[] = [];
  const run = unitTestController.createTestRun(request);

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

  const runTestQueue = async () => {
    for (const { test, data } of queue) {
      run.appendOutput(`Running ${test.id}\r\n`);
      if (run.token.isCancellationRequested) {
        run.skipped(test);
      } else {
        run.started(test);
        await data.run(test, run);
      }

      run.appendOutput(`Completed ${test.id}\r\n`);
    }

    run.end();
  };

  discoverTests(request.include ?? gatherTestItems(unitTestController.items)).then(runTestQueue);
};

const gatherTestItems = (collection: TestItemCollection) => {
  const items: TestItem[] = [];
  collection.forEach((item: TestItem) => items.push(item));

  return items;
};
