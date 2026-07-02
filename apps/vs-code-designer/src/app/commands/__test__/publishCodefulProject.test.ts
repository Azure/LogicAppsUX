import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ext } from '../../../extensionVariables';
import { hasCodefulWorkflowSetting } from '../../utils/codeful';
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
  hasCodefulWorkflowSetting: vi.fn(),
  inspectCodefulCsprojBuildHooks: vi.fn(),
  invalidateCodefulSdkCacheIfNeeded: vi.fn(),
}));

import { inspectCodefulCsprojBuildHooks, invalidateCodefulSdkCacheIfNeeded } from '../../utils/codeful';

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
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(true);
    (invalidateCodefulSdkCacheIfNeeded as Mock).mockResolvedValue(false);
    (inspectCodefulCsprojBuildHooks as Mock).mockResolvedValue({
      copyAfterTargets: 'Build;Publish',
      replaceLangAfterTargets: 'Build;Publish',
      runsOnBuild: true,
    });
  });

  it('records telemetry and exits when no project path is available', async () => {
    (getWorkspaceRoot as Mock).mockResolvedValue(undefined);

    await publishCodefulProject(context, undefined as any);

    expect(context.telemetry.properties).toMatchObject({
      result: 'Failed',
      errorMessage: 'No project path found to publish custom code functions project.',
    });
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('No project path found to publish custom code functions project.');
    expect(hasCodefulWorkflowSetting).not.toHaveBeenCalled();
  });

  it('skips publishing when the selected path is not codeful', async () => {
    (hasCodefulWorkflowSetting as Mock).mockResolvedValue(false);

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
    expect(invalidateCodefulSdkCacheIfNeeded).toHaveBeenCalledWith(projectPath);
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

  describe('skipIfBuildPopulatesCodeful option', () => {
    it('skips the publish task when the csproj hooks CopyToCodeful on Build', async () => {
      const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
      ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);
      (inspectCodefulCsprojBuildHooks as Mock).mockResolvedValue({
        copyAfterTargets: 'Build;Publish',
        replaceLangAfterTargets: 'Build;Publish',
        runsOnBuild: true,
      });

      await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri, { skipIfBuildPopulatesCodeful: true });

      expect((vscode as any).tasks.executeTask).not.toHaveBeenCalled();
      expect((vscode as any).tasks.fetchTasks).not.toHaveBeenCalled();
      expect(context.telemetry.properties).toMatchObject({
        publishSkipped: 'true',
        publishSkippedReason: 'csprojCopyToCodefulRunsOnBuild',
        csprojCopyAfterTargets: 'Build;Publish',
        csprojReplaceLangAfterTargets: 'Build;Publish',
      });
      // The skip path should not record a lastStep / result the way the run path does,
      // because publish was intentionally not attempted.
      expect(context.telemetry.properties.result).toBeUndefined();
    });

    it('still runs the publish task when csproj uses the legacy Publish-only hook', async () => {
      const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
      ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);
      (inspectCodefulCsprojBuildHooks as Mock).mockResolvedValue({
        copyAfterTargets: 'Publish',
        replaceLangAfterTargets: 'Build;Publish',
        runsOnBuild: false,
      });

      await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri, { skipIfBuildPopulatesCodeful: true });

      expect((vscode as any).tasks.executeTask).toHaveBeenCalledWith(publishTask);
      expect(context.telemetry.properties).toMatchObject({
        publishSkipped: 'false',
        csprojCopyAfterTargets: 'Publish',
        csprojReplaceLangAfterTargets: 'Build;Publish',
        result: 'Succeeded',
      });
    });

    it('still runs the publish task when no csproj could be inspected', async () => {
      const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
      ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);
      (inspectCodefulCsprojBuildHooks as Mock).mockResolvedValue(null);

      await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri, { skipIfBuildPopulatesCodeful: true });

      expect((vscode as any).tasks.executeTask).toHaveBeenCalledWith(publishTask);
      expect(context.telemetry.properties.publishSkipped).toBe('false');
      expect(context.telemetry.properties.result).toBe('Succeeded');
    });

    it('does not inspect the csproj when the option is not provided (deploy path)', async () => {
      const publishTask = { name: 'publish', scope: { uri: { fsPath: projectPath } } } as vscode.Task;
      ((vscode as any).tasks.fetchTasks as Mock).mockResolvedValue([publishTask]);

      await publishCodefulProject(context, { fsPath: projectPath } as vscode.Uri);

      expect(inspectCodefulCsprojBuildHooks).not.toHaveBeenCalled();
      expect((vscode as any).tasks.executeTask).toHaveBeenCalledWith(publishTask);
      expect(context.telemetry.properties.publishSkipped).toBeUndefined();
      expect(context.telemetry.properties.result).toBe('Succeeded');
    });
  });
});
