/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, expect } from 'vitest';
import createWorkspaceReducer, {
  initializeProject,
  initializeWorkspace,
  resetState,
  setCurrentStep,
  setWorkspaceName,
  setTargetFramework,
} from '../createWorkspaceSlice';
import type { CreateWorkspaceState } from '../createWorkspaceSlice';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

const getState = (overrides: Partial<CreateWorkspaceState> = {}): CreateWorkspaceState => ({
  ...(createWorkspaceReducer(undefined, { type: '@@INIT' } as any) as CreateWorkspaceState),
  ...overrides,
});

describe('createWorkspaceSlice', () => {
  describe('initializeWorkspace', () => {
    it('sets platform, separator, logicAppType and logicAppName from the host payload', () => {
      const result = createWorkspaceReducer(
        getState(),
        initializeWorkspace({
          platform: Platform.windows,
          separator: '\\',
          logicAppType: 'customCode',
          logicAppName: 'MyLogicApp',
        })
      );
      expect(result.platform).toBe(Platform.windows);
      expect(result.separator).toBe('\\');
      expect(result.logicAppType).toBe('customCode');
      expect(result.logicAppName).toBe('MyLogicApp');
    });
  });

  describe('initializeProject', () => {
    it('sets project fields and captures platform + separator from the host payload', () => {
      const workspaceFileJson = { folders: [{ name: 'existing' }] };
      const result = createWorkspaceReducer(
        getState(),
        initializeProject({
          workspaceFileJson,
          logicAppsWithoutCustomCode: ['app1'],
          platform: Platform.windows,
          separator: '\\',
        })
      );
      expect(result.workspaceFileJson).toEqual(workspaceFileJson);
      expect(result.logicAppsWithoutCustomCode).toEqual(['app1']);
      // Regression: createProject flow must surface platform so Windows-only .NET Framework appears.
      expect(result.platform).toBe(Platform.windows);
      expect(result.separator).toBe('\\');
    });

    it('leaves platform/separator untouched when the payload omits them', () => {
      const seeded = getState({ platform: Platform.windows, separator: '\\' });
      const result = createWorkspaceReducer(seeded, initializeProject({ workspaceFileJson: {}, logicAppsWithoutCustomCode: undefined }));
      expect(result.platform).toBe(Platform.windows);
      expect(result.separator).toBe('\\');
    });
  });

  describe('resetState', () => {
    it('preserves platform and separator while clearing form fields when payload is undefined', () => {
      let state = getState({ platform: Platform.windows, separator: '\\' });
      state = createWorkspaceReducer(state, setWorkspaceName('MyWorkspace'));
      state = createWorkspaceReducer(state, setCurrentStep(3));
      state = createWorkspaceReducer(state, setTargetFramework('net472'));

      const result = createWorkspaceReducer(state, resetState(undefined));

      // Host-environment values survive.
      expect(result.platform).toBe(Platform.windows);
      expect(result.separator).toBe('\\');
      // Form fields are cleared.
      expect(result.workspaceName).toBe('');
      expect(result.currentStep).toBe(0);
      expect(result.targetFramework).toBe('');
      expect(result.logicAppType).toBe('');
      expect(result.logicAppName).toBe('');
    });

    it('preserves platform, separator, logicAppType and logicAppName when preserveLogicAppData is true', () => {
      const state = getState({
        platform: Platform.windows,
        separator: '\\',
        logicAppType: 'customCode',
        logicAppName: 'MyLogicApp',
        workspaceName: 'MyWorkspace',
      });

      const result = createWorkspaceReducer(state, resetState({ preserveLogicAppData: true }));

      expect(result.platform).toBe(Platform.windows);
      expect(result.separator).toBe('\\');
      expect(result.logicAppType).toBe('customCode');
      expect(result.logicAppName).toBe('MyLogicApp');
      // Non-preserved form field still cleared.
      expect(result.workspaceName).toBe('');
    });
  });

  describe('platform survives the createWorkspace init -> mount reset sequence', () => {
    it('keeps platform=win32 after initializeWorkspace followed by resetState(undefined)', () => {
      let state = getState();
      // Host initialize_frame.
      state = createWorkspaceReducer(
        state,
        initializeWorkspace({ platform: Platform.windows, separator: '\\', logicAppType: '', logicAppName: '' })
      );
      // Flow wrapper mount effect.
      state = createWorkspaceReducer(state, resetState(undefined));

      expect(state.platform).toBe(Platform.windows);
    });
  });

  describe('platform survives the createProject init -> mount reset sequence', () => {
    it('keeps platform=win32 after initializeProject followed by resetState(undefined)', () => {
      let state = getState();
      // Host initialize_frame for the createProject (createLogicApp) flow.
      state = createWorkspaceReducer(
        state,
        initializeProject({
          workspaceFileJson: {},
          logicAppsWithoutCustomCode: undefined,
          platform: Platform.windows,
          separator: '\\',
        })
      );
      // Flow wrapper mount effect.
      state = createWorkspaceReducer(state, resetState(undefined));

      expect(state.platform).toBe(Platform.windows);
    });
  });
});
