import { getDebugConfiguration } from '../debug';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionCommand } from '../../../constants';
import { FuncVersion, TargetFramework } from '@microsoft/vscode-extension-logic-apps';

describe('debug', () => {
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
    });

    describe('without custom code target framework', () => {
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
