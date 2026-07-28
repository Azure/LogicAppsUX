/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { func, funcDependencyName, hostStartCommand } from '../../../../../constants';
import { binariesExistSync } from '../../../../utils/binaries';
import { getFuncHostTaskEnv } from '../../../../utils/codeless/funcHostTaskEnv';
import { InitCustomCodeScriptProjectStep } from '../initCustomCodeScriptProjectStep';
import { InitCustomCodeProjectStep } from '../initCustomCodeProjectStep';
import type { TaskDefinition } from 'vscode';

vi.mock('../../../../utils/binaries', () => ({
  binariesExistSync: vi.fn(),
}));

const getFuncHostStartTask = (tasks: TaskDefinition[]): TaskDefinition =>
  tasks.find((task) => task.label === 'func: host start') as TaskDefinition;

// Each getTasks reads `binariesExistSync(funcDependencyName)`. The synchronous helper lets the
// steps stay synchronous while still branching on whether the runtime binaries are installed:
// `true` points func: host start at the packaged binary, `false` falls back to the CLI command.
describe('custom code getTasks branches on binariesExistSync', () => {
  const cases: Array<[string, () => TaskDefinition[]]> = [
    [
      'InitCustomCodeScriptProjectStep',
      () => (InitCustomCodeScriptProjectStep.prototype as any).getTasks.call({ useFuncExtensionsInstall: false }),
    ],
    ['InitCustomCodeProjectStep', () => (InitCustomCodeProjectStep.prototype as any).getTasks.call({})],
  ];

  beforeEach(() => {
    vi.mocked(binariesExistSync).mockReset();
  });

  describe.each(cases)('%s', (_name, getTasks) => {
    it('points func: host start at the installed binary when binariesExistSync returns true', () => {
      vi.mocked(binariesExistSync).mockReturnValue(true);

      const tasks = getTasks();

      expect(binariesExistSync).toHaveBeenCalledWith(funcDependencyName);
      const funcTask = getFuncHostStartTask(tasks);
      expect(funcTask.type).toBe('shell');
      expect(funcTask.command).toBe('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');
      expect(funcTask.args).toEqual(['host', 'start']);
    });

    it('falls back to the func host start command when binariesExistSync returns false', () => {
      vi.mocked(binariesExistSync).mockReturnValue(false);

      const tasks = getTasks();

      expect(binariesExistSync).toHaveBeenCalledWith(funcDependencyName);
      const funcTask = getFuncHostStartTask(tasks);
      expect(funcTask.type).toBe(func);
      expect(funcTask.command).toBe(hostStartCommand);
      expect(funcTask.args).toBeUndefined();
    });
  });
});

// The func-host-start branch injects a platform-keyed PATH `options` block
// (getFuncHostTaskEnv) only when the binaries exist. These assertions lock the full task
// list each modified step returns so the binariesExistSync result is threaded through the
// whole array (not just the func task) and the env injection stays wired up.
describe('custom code getTasks full task list', () => {
  beforeEach(() => {
    vi.mocked(binariesExistSync).mockReset();
  });

  describe('InitCustomCodeScriptProjectStep', () => {
    const getTasks = (): TaskDefinition[] =>
      (InitCustomCodeScriptProjectStep.prototype as any).getTasks.call({ useFuncExtensionsInstall: false });

    it('returns only the func: host start task and injects the PATH env when binaries exist', () => {
      vi.mocked(binariesExistSync).mockReturnValue(true);

      const tasks = getTasks();

      expect(tasks.map((task) => task.label)).toEqual(['func: host start']);
      const funcTask = getFuncHostStartTask(tasks);
      const expectedEnv = getFuncHostTaskEnv();
      expect(funcTask.options).toEqual(expectedEnv.options);
      expect(funcTask.windows).toEqual(expectedEnv.windows);
      expect(funcTask.linux).toEqual(expectedEnv.linux);
      expect(funcTask.osx).toEqual(expectedEnv.osx);
    });

    it('omits the PATH env when binaries are missing', () => {
      vi.mocked(binariesExistSync).mockReturnValue(false);

      const tasks = getTasks();

      const funcTask = getFuncHostStartTask(tasks);
      expect(funcTask.options).toBeUndefined();
      expect(funcTask.windows).toBeUndefined();
      expect(funcTask.linux).toBeUndefined();
      expect(funcTask.osx).toBeUndefined();
    });
  });

  describe('InitCustomCodeProjectStep', () => {
    const getTasks = (): TaskDefinition[] => (InitCustomCodeProjectStep.prototype as any).getTasks.call({});

    it('returns generateDebugSymbols plus func: host start and injects env when binaries exist', () => {
      vi.mocked(binariesExistSync).mockReturnValue(true);

      const tasks = getTasks();

      expect(tasks.map((task) => task.label)).toEqual(['generateDebugSymbols', 'func: host start']);

      const generateDebugSymbols = tasks.find((task) => task.label === 'generateDebugSymbols') as TaskDefinition;
      expect(generateDebugSymbols.type).toBe('process');
      expect(generateDebugSymbols.command).toBe('${config:azureLogicAppsStandard.dotnetBinaryPath}');
      expect(generateDebugSymbols.args).toEqual(['${input:getDebugSymbolDll}']);

      const funcTask = getFuncHostStartTask(tasks);
      expect(funcTask.group).toEqual({ kind: 'build', isDefault: true });
      expect(funcTask.options).toEqual(getFuncHostTaskEnv().options);
    });

    it('omits the PATH env when binaries are missing', () => {
      vi.mocked(binariesExistSync).mockReturnValue(false);

      const tasks = getTasks();

      expect(tasks.map((task) => task.label)).toEqual(['generateDebugSymbols', 'func: host start']);
      const funcTask = getFuncHostStartTask(tasks);
      expect(funcTask.options).toBeUndefined();
      expect(funcTask.windows).toBeUndefined();
    });
  });
});
