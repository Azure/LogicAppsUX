import { getDebugConfiguration, getDebugSymbolDll } from '../debug';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { debugSymbolDll, extensionBundleId, extensionCommand } from '../../../constants';
import { FuncVersion, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../bundleFeed', () => ({
  getBundleVersionNumber: vi.fn(),
  getExtensionBundleFolder: vi.fn(),
}));

import { getBundleVersionNumber, getExtensionBundleFolder } from '../bundleFeed';

describe('debug', () => {
  it('should build the debug symbol dll path from the extension bundle folder and version', async () => {
    vi.mocked(getExtensionBundleFolder).mockResolvedValue('C:\\bundles');
    vi.mocked(getBundleVersionNumber).mockResolvedValue('1.2.3');

    await expect(getDebugSymbolDll()).resolves.toContain(`${extensionBundleId}\\1.2.3\\bin\\${debugSymbolDll}`);
  });

  describe('getDebugConfiguration', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('with custom code target framework', () => {
      it('should return launch configuration for .NET 8 custom code with v4 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v4, 'TestLogicApp', TargetFramework.Net8);
        expect(result).toEqual({
          name: 'Run/Debug logic app with local function TestLogicApp',
          type: 'logicapp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'coreclr',
          isCodeless: true,
        });
      });

      it('should return launch configuration for .NET Framework custom code with v1 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v1, 'TestLogicApp', TargetFramework.NetFx);

        expect(result).toEqual({
          name: 'Run/Debug logic app with local function TestLogicApp',
          type: 'logicapp',
          request: 'launch',
          funcRuntime: 'clr',
          customCodeRuntime: 'clr',
          isCodeless: true,
        });
      });

      it('should return launch configuration for .NET Framework custom code with v3 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v3, 'TestLogicApp', TargetFramework.NetFx);

        expect(result).toEqual({
          name: 'Run/Debug logic app with local function TestLogicApp',
          type: 'logicapp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'clr',
          isCodeless: true,
        });
      });

      it('should return launch configuration for .NET 8 custom code with v2 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v2, 'MyApp', TargetFramework.Net8);

        expect(result).toEqual({
          name: 'Run/Debug logic app with local function MyApp',
          type: 'logicapp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'coreclr',
          isCodeless: true,
        });
      });
    });

    describe('without custom code target framework', () => {
      it('should return attach configuration for v1 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v1, 'TestLogicApp');

        expect(result).toEqual({
          name: 'Run/Debug logic app TestLogicApp',
          type: 'clr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });

      it('should return attach configuration for v2 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v2, 'TestLogicApp');

        expect(result).toEqual({
          name: 'Run/Debug logic app TestLogicApp',
          type: 'coreclr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });

      it('should return attach configuration for v3 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v3, 'TestLogicApp');

        expect(result).toEqual({
          name: 'Run/Debug logic app TestLogicApp',
          type: 'coreclr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });

      it('should return attach configuration for v4 function runtime', () => {
        const result = getDebugConfiguration(FuncVersion.v4, 'MyLogicApp');

        expect(result).toEqual({
          name: 'Run/Debug logic app MyLogicApp',
          type: 'coreclr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty logic app name with custom code', () => {
        const result = getDebugConfiguration(FuncVersion.v4, '', TargetFramework.Net8);

        expect(result).toEqual({
          name: 'Run/Debug logic app with local function ',
          type: 'logicapp',
          request: 'launch',
          funcRuntime: 'coreclr',
          customCodeRuntime: 'coreclr',
          isCodeless: true,
        });
      });

      it('should handle empty logic app name without custom code', () => {
        const result = getDebugConfiguration(FuncVersion.v3, '');

        expect(result).toEqual({
          name: 'Run/Debug logic app ',
          type: 'coreclr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });

      it('should handle special characters in logic app name', () => {
        const logicAppName = 'Test-App_With.Special@Characters';
        const result = getDebugConfiguration(FuncVersion.v4, logicAppName);

        expect(result).toEqual({
          name: `Run/Debug logic app ${logicAppName}`,
          type: 'coreclr',
          request: 'attach',
          processId: `\${command:${extensionCommand.pickProcess}}`,
        });
      });
    });
  });
});
