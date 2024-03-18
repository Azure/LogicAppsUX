import { ext } from '../../../extensionVariables';
import { TestFile, testData } from './testTree';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import {
  type GlobPattern,
  RelativePattern,
  type TestController,
  workspace,
  type Uri,
  type CancellationToken,
  type TestRunRequest,
  type EventEmitter,
  type TestItem,
  type ExtensionContext,
} from 'vscode';

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
export const runHandler = (request: TestRunRequest, cancellation: CancellationToken) => {
  if (isNullOrUndefined(request.include)) {
    ext.watchingTests.set('ALL', request.profile);
    cancellation.onCancellationRequested(() => ext.watchingTests.delete('ALL'));
  } else {
    request.include.forEach((item) => ext.watchingTests.set(item, request.profile));
    cancellation.onCancellationRequested(() => request.include.forEach((item) => ext.watchingTests.delete(item)));
  }
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

  const data = testData.get(item);
  if (data instanceof TestFile) {
    await data.updateFromDisk(ctrl, item);
  }
};

const testsWorkspaceWatcher = (controller: TestController, fileChangedEmitter: EventEmitter<Uri>) => {
  return getWorkspaceTestPatterns().map((test) => {
    const watcher = workspace.createFileSystemWatcher(test.pattern);

    watcher.onDidCreate((uri) => {
      getOrCreateFile(controller, uri);
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidChange(async (uri) => {
      const { file, data } = getOrCreateFile(controller, uri);
      if (data.didResolve) {
        await data.updateFromDisk(controller, file);
      }
      fileChangedEmitter.fire(uri);
    });
    watcher.onDidDelete((uri) => controller.items.delete(uri.toString()));

    findInitialFiles(controller, test.pattern);

    return watcher;
  });
};

/**
 * Finds initial files based on the provided pattern and creates a test file on each file.
 * @param {TestController} controller The test controller.
 * @param {GlobPattern} pattern The glob pattern used to find files.
 */
const findInitialFiles = async (controller: TestController, pattern: GlobPattern) => {
  for (const file of await workspace.findFiles(pattern)) {
    getOrCreateFile(controller, file);
  }
};

const getOrCreateFile = (controller: TestController, uri: Uri) => {
  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { file: existing, data: testData.get(existing) as TestFile };
  }

  const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop(), uri);
  controller.items.add(file);

  const data = new TestFile();
  testData.set(file, data);

  file.canResolveChildren = true;
  return { file, data };
};
