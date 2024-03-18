import { TestFile, testData } from './testTree';
import { type GlobPattern, RelativePattern, type TestController, workspace, type Uri } from 'vscode';

export const getWorkspaceTestPatterns = () => {
  if (!workspace.workspaceFolders) {
    return [];
  }

  return workspace.workspaceFolders.map((workspaceFolder) => ({
    workspaceFolder,
    pattern: new RelativePattern(workspaceFolder, '**/*.unit-test.json'),
  }));
};

export const findInitialFiles = async (controller: TestController, pattern: GlobPattern) => {
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
