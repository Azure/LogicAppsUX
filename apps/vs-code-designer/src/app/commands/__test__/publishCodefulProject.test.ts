import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { isCodefulProject } from '../../utils/codeful';
import { getWorkspaceRoot } from '../../utils/workspace';
import { publishCodefulProject } from '../publishCodefulProject';

vi.mock('../../../localize', () => ({
  localize: (_key: string, defaultValue: string, ...args: unknown[]) =>
    defaultValue.replace(/{(\d+)}/g, (_match, index) => String(args[Number(index)] ?? '')),
}));

vi.mock('../../utils/workspace', () => ({
  getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../utils/codeful', () => ({
  isCodefulProject: vi.fn(),
}));

describe('publishCodefulProject', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  let context: any;
  let endTaskProcessHandler: ((event: any) => void) | undefined;
  let dispose: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    context = { telemetry: { properties: {}, measurements: {} } };
    endTaskProcessHandler = undefined;
    dispose = vi.fn();
    (vscode as any).tasks = {
      fetchTasks: vi.fn(),
      onDidEndTaskProcess: vi.fn((handler: (event: any) => void) => {
        endTaskProcessHandler = handler;
        return { dispose };
      }),
      executeTask: vi.fn((task: vscode.Task) => {
        endTaskProcessHandler?.({ execution: { task }, exitCode: 0 });
      }),
    };
    (getWorkspaceRoot as Mock).mockResolvedValue(projectPath);
    (isCodefulProject as Mock).mockResolvedValue(true);
  });

  it('records telemetry and exits when no project path is available', async () => {
    (getWorkspaceRoot as Mock).mockResolvedValue(undefined);

    await publishCodefulProject(context, undefined as any);

    expect(context.telemetry.properties).toMatchObject({
      result: 'Failed',
      errorMessage: 'No project path found to publish custom code functions project.',
    });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('No project path found to publish custom code functions project.');
    expect(isCodefulProject).not.toHaveBeenCalled();
  });

  it('skips publishing when the selected path is not codeful', async () => {
    (isCodefulProject as Mock).mockResolvedValue(false);

    await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri);

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`Skipping publish: Path "${projectPath}" is not a codeful project.`);
    expect((vscode as any).tasks.fetchTasks).not.toHaveBeenCalled();
  });

  it('fails when no publish task exists for the codeful project', async () => {
    ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([]);

    await expect(publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri)).rejects.toThrow(
      `Publish task not found for project at "${projectPath}".`
    );

    expect(context.telemetry.properties).toMatchObject({
      lastStep: 'publishCodefulProject',
      result: 'Failed',
      errorMessage: `Publish task not found for project at "${projectPath}".`,
    });
  });

  it('runs the publish task and records success', async () => {
    const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
    ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);

    await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri);

    expect((vscode as any).tasks.executeTask).toHaveBeenCalledWith(publishTask);
    expect(dispose).toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`Codeful project published successfully at ${projectPath}.`);
    expect(context.telemetry.properties.result).toBe('Succeeded');
  });

  it('records telemetry and rethrows when the publish task fails', async () => {
    const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
    ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);
    ((vscode as any).tasks.executeTask as Mock).mockImplementation((task: vscode.Task) => {
      endTaskProcessHandler?.({ execution: { task }, exitCode: 1 });
    });

    await expect(publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri)).rejects.toThrow(
      `Error publishing codeful project at "${projectPath}": 1`
    );

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(`Error publishing codeful project at "${projectPath}": 1`);
    expect(context.telemetry.properties).toMatchObject({
      result: 'Failed',
      errorMessage: `Error publishing codeful project at "${projectPath}": 1`,
    });
  });
});
