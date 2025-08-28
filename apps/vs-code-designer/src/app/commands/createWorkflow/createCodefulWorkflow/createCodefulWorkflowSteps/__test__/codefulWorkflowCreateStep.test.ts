import { describe, it, expect, vi, Mock } from 'vitest';
import { CodefulWorkflowCreateStep } from '../codefulWorkflowCreateStep';
import { IFunctionWizardContext, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { setLocalAppSetting } from '../../../../../utils/appSettings/localSettings';
import {
  appKindSetting,
  azureWebJobsStorageKey,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  localEmulatorConnectionString,
  logicAppKind,
  workerRuntimeKey,
} from '../../../../../../constants';

describe('CodefulWorkflowCreateStep', async () => {
  describe('updateAppSettings', async () => {
    it('update app settings with mock setLocalAppSetting', async () => {
      const mockContext: Partial<IFunctionWizardContext> = { projectPath: 'testPath' };
      const mockActionContext: IActionContext = {} as IActionContext;
      const testCodefulWorkflowCreateStep = await CodefulWorkflowCreateStep.createStep(mockActionContext);

      vi.mock('../../../../../utils/appSettings/localSettings', () => ({
        setLocalAppSetting: vi.fn().mockReturnValue(Promise.resolve()),
        removeAppKindFromLocalSettings: vi.fn(),
      }));

      testCodefulWorkflowCreateStep.updateAppSettings(mockContext as IFunctionWizardContext);
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == workerRuntimeKey && call[3] == WorkerRuntime.Dotnet;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == functionsInprocNet8Enabled && call[3] == functionsInprocNet8EnabledTrue;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == appKindSetting && call[3] == logicAppKind;
        })
      );
      expect(
        (setLocalAppSetting as unknown as Mock).mock.calls.some((call) => {
          return call[2] == azureWebJobsStorageKey && call[1] == localEmulatorConnectionString;
        })
      );
    });
  });
});
