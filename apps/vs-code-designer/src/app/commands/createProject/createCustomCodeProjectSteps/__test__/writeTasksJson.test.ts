/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { func, hostStartCommand, tasksVersion } from '../../../../../constants';
import { confirmEditJsonFile } from '../../../../utils/fs';
import { InitCustomCodeProjectStepBase } from '../initCustomCodeProjectStepBase';
import type { ITasksJson } from '@microsoft/vscode-extension-logic-apps';
import type { TaskDefinition } from 'vscode';

vi.mock('../../../../utils/fs', async (importActual) => {
  const actual = await importActual<typeof import('../../../../utils/fs')>();
  return { ...actual, confirmEditJsonFile: vi.fn() };
});

// writeTasksJson calls `this.getTasks()` (synchronous on main) and threads the returned task
// objects through insertNewTasks into tasks.json. This exercises the real base method to prove
// the tasks each step produces are actually written to tasks.json via confirmEditJsonFile.
describe('InitCustomCodeProjectStepBase.writeTasksJson writes getTasks output', () => {
  const writeTasksJson = (InitCustomCodeProjectStepBase.prototype as any).writeTasksJson as (
    this: unknown,
    context: unknown,
    vscodePath: string
  ) => Promise<void>;
  const insertNewTasks = (InitCustomCodeProjectStepBase.prototype as any).insertNewTasks;

  const resolvedTasks: TaskDefinition[] = [{ label: 'func: host start', type: func, command: hostStartCommand }];

  let capturedTasks: ITasksJson | undefined;

  beforeEach(() => {
    capturedTasks = undefined;
    vi.mocked(confirmEditJsonFile).mockReset();
    vi.mocked(confirmEditJsonFile).mockImplementation(async (_context: any, _path: string, callback: (data: any) => any): Promise<void> => {
      capturedTasks = callback({ version: tasksVersion });
    });
  });

  it('writes the tasks returned by getTasks into tasks.json', async () => {
    const getTasks = vi.fn().mockReturnValue(resolvedTasks);
    const thisArg = { getTasks, insertNewTasks };
    // context.workspaceFolder is undefined, so writeTasksJson takes the manual-JSON branch
    // and routes through confirmEditJsonFile (mocked above to capture the written data).
    const context = { workspacePath: '/ws', projectPath: '/ws', workspaceFolder: undefined };

    await writeTasksJson.call(thisArg, context, '/ws/.vscode');

    expect(getTasks).toHaveBeenCalledTimes(1);
    expect(confirmEditJsonFile).toHaveBeenCalledTimes(1);
    expect(capturedTasks?.tasks).toEqual(resolvedTasks);
    const funcTask = capturedTasks?.tasks?.find((task) => task.label === 'func: host start');
    expect(funcTask?.command).toBe(hostStartCommand);
  });
});
