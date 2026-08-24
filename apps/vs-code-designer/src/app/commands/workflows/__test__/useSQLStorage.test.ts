import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sqlStorageConnectionStringKey } from '../../../../constants';
import { addOrUpdateLocalAppSettings } from '../../../utils/appSettings/localSettings';
import { validateSQLConnectionString } from '../../../utils/sql';
import { getLogicAppProjectRoot, getParentLogicAppRoot } from '../../../utils/workspace';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { useSQLStorage } from '../useSQLStorage';

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

vi.mock('../../../utils/appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
}));

vi.mock('../../../utils/sql', () => ({
  validateSQLConnectionString: vi.fn(),
}));

vi.mock('../../../utils/workspace', () => ({
  getLogicAppProjectRoot: vi.fn(),
  getParentLogicAppRoot: vi.fn(),
}));

vi.mock('../../../utils/verifyIsProject', () => ({
  tryGetLogicAppProjectRoot: vi.fn(),
}));

describe('useSQLStorage project resolution', () => {
  const sqlConnectionString = 'Server=tcp:example;Database=logicapps';
  const context = {
    telemetry: { measurements: {}, properties: {} },
    ui: {
      showInputBox: vi.fn(),
    },
  } as unknown as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(context.ui.showInputBox).mockResolvedValue(sqlConnectionString);
    vi.mocked(getLogicAppProjectRoot).mockResolvedValue('/workspace/project');
    vi.mocked(getParentLogicAppRoot).mockResolvedValue(undefined);
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue(undefined);
    vi.mocked(validateSQLConnectionString).mockResolvedValue(undefined);
    vi.mocked(addOrUpdateLocalAppSettings).mockResolvedValue(undefined);
  });

  it.each([
    ['an absent URI', undefined],
    ['an empty-object URI', {} as vscode.Uri],
  ])('falls back to workspace project selection for %s', async (_label, target) => {
    await useSQLStorage(context, target);

    expect(getLogicAppProjectRoot).toHaveBeenCalledWith(context);
    expect(getParentLogicAppRoot).not.toHaveBeenCalled();
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, '/workspace/project', {
      [sqlStorageConnectionStringKey]: sqlConnectionString,
    });
  });

  it('resolves a nested project from a workspace-root ancestor URI', async () => {
    vi.mocked(tryGetLogicAppProjectRoot).mockResolvedValue('/workspace/projects/logic-app');

    await useSQLStorage(context, { fsPath: '/workspace' } as vscode.Uri);

    expect(getParentLogicAppRoot).toHaveBeenCalledWith('/workspace');
    expect(tryGetLogicAppProjectRoot).toHaveBeenCalledWith(context, '/workspace');
    expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, '/workspace/projects/logic-app', {
      [sqlStorageConnectionStringKey]: sqlConnectionString,
    });
  });

  it('resolves a project descendant through its parent Logic App root', async () => {
    vi.mocked(getParentLogicAppRoot).mockResolvedValue('/workspace/projects/logic-app');
    const workflowFilePath = '/workspace/projects/logic-app/workflows/workflow-a/workflow.json';

    await useSQLStorage(context, { fsPath: workflowFilePath } as vscode.Uri);

    expect(getParentLogicAppRoot).toHaveBeenCalledWith(workflowFilePath);
    expect(tryGetLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(getLogicAppProjectRoot).not.toHaveBeenCalled();
    expect(addOrUpdateLocalAppSettings).toHaveBeenCalledWith(context, '/workspace/projects/logic-app', {
      [sqlStorageConnectionStringKey]: sqlConnectionString,
    });
  });
});
