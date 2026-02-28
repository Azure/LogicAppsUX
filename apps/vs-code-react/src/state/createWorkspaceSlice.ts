/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { Platform } from '@microsoft/vscode-extension-logic-apps';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ITargetDirectory } from '../run-service';

export interface CreateWorkspaceState {
  currentStep: number;
  packagePath: ITargetDirectory;
  workspaceProjectPath: ITargetDirectory;
  workspaceName: string;
  logicAppType: string;
  functionNamespace: string;
  functionName: string;
  functionFolderName: string;
  workflowType: string;
  workflowName: string;
  targetFramework: string;
  logicAppName: string;
  projectType: string;
  openBehavior: string;
  isLoading: boolean;
  error?: string;
  isComplete: boolean;
  workspaceFileJson: any;
  logicAppsWithoutCustomCode: any | undefined;
  flowType: 'createWorkspace' | 'createWorkspaceFromPackage' | 'createLogicApp' | 'convertToWorkspace' | 'createWorkflow';
  pathValidationResults: Record<string, boolean>;
  packageValidationResults: Record<string, boolean>;
  workspaceExistenceResults: Record<string, boolean>;
  isValidatingWorkspace: boolean;
  isValidatingPackage: boolean;
  separator: string;
  platform: Platform | null;
  isDevContainerProject: boolean;
}

const initialState: CreateWorkspaceState = {
  currentStep: 0,
  packagePath: {
    fsPath: '',
    path: '',
  },
  workspaceProjectPath: {
    fsPath: '',
    path: '',
  },
  workspaceName: '',
  logicAppType: '',
  functionNamespace: '',
  functionName: '',
  functionFolderName: '',
  workflowType: '',
  workflowName: '',
  targetFramework: '',
  logicAppName: '',
  projectType: '',
  openBehavior: '',
  isLoading: false,
  isComplete: false,
  workspaceFileJson: '',
  logicAppsWithoutCustomCode: undefined,
  flowType: 'createWorkspace',
  pathValidationResults: {},
  packageValidationResults: {},
  workspaceExistenceResults: {},
  isValidatingWorkspace: false,
  isValidatingPackage: false,
  separator: '/',
  platform: null,
  isDevContainerProject: false,
};

export const createWorkspaceSlice = createSlice<CreateWorkspaceState, SliceCaseReducers<CreateWorkspaceState>, 'createWorkspace'>({
  name: 'createWorkspace',
  initialState,
  reducers: {
    initializeProject: (state, action: PayloadAction<any>) => {
      const { workspaceFileJson, logicAppsWithoutCustomCode } = action.payload;
      state.workspaceFileJson = workspaceFileJson;
      state.logicAppsWithoutCustomCode = logicAppsWithoutCustomCode;
    },
    initializeWorkspace: (state, action: PayloadAction<any>) => {
      const { separator, platform, logicAppType, logicAppName } = action.payload;
      state.separator = separator;
      state.platform = platform;
      state.logicAppType = logicAppType || '';
      state.logicAppName = logicAppName || '';
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setPackagePath: (state, action: PayloadAction<{ targetDirectory: ITargetDirectory } | string>) => {
      if (typeof action.payload === 'string') {
        state.packagePath = { path: action.payload, fsPath: action.payload };
      } else if (action.payload && typeof action.payload === 'object') {
        const { targetDirectory } = action.payload;
        state.packagePath = targetDirectory;
      } else {
        state.packagePath = { path: '', fsPath: '' };
      }
      state.logicAppType = ProjectType.logicApp;
    },
    setProjectPath: (state, action: PayloadAction<{ targetDirectory: ITargetDirectory } | string>) => {
      if (typeof action.payload === 'string') {
        state.workspaceProjectPath = { path: action.payload, fsPath: action.payload };
      } else if (action.payload && typeof action.payload === 'object') {
        const { targetDirectory } = action.payload;
        state.workspaceProjectPath = targetDirectory;
      } else {
        state.workspaceProjectPath = { path: '', fsPath: '' };
      }
    },
    setWorkspaceName: (state, action: PayloadAction<string>) => {
      state.workspaceName = action.payload;
    },
    setIsDevContainerProject: (state, action: PayloadAction<boolean>) => {
      state.isDevContainerProject = action.payload;
    },
    setLogicAppType: (state, action: PayloadAction<string>) => {
      state.logicAppType = action.payload;
    },
    setFunctionNamespace: (state, action: PayloadAction<string>) => {
      state.functionNamespace = action.payload;
    },
    setFunctionName: (state, action: PayloadAction<string>) => {
      state.functionName = action.payload;
    },
    setFunctionFolderName: (state, action: PayloadAction<string>) => {
      state.functionFolderName = action.payload;
    },
    setWorkflowType: (state, action: PayloadAction<string>) => {
      state.workflowType = action.payload;
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    setTargetFramework: (state, action: PayloadAction<string>) => {
      state.targetFramework = action.payload;
    },
    setLogicAppName: (state, action: PayloadAction<string>) => {
      state.logicAppName = action.payload;
    },
    setProjectType: (state, action: PayloadAction<string>) => {
      state.projectType = action.payload;
    },
    setSeparator: (state, action: PayloadAction<string>) => {
      state.separator = action.payload;
    },
    setOpenBehavior: (state, action: PayloadAction<string>) => {
      state.openBehavior = action.payload;
    },
    setFlowType: (
      state,
      action: PayloadAction<'createWorkspace' | 'createWorkspaceFromPackage' | 'createLogicApp' | 'convertToWorkspace'>
    ) => {
      state.flowType = action.payload;
    },
    setPathValidationResult: (state, action: PayloadAction<{ path: string; isValid: boolean }>) => {
      const { path, isValid } = action.payload;
      state.pathValidationResults[path] = isValid;
    },
    setPackageValidationResult: (state, action: PayloadAction<{ path: string; isValid: boolean }>) => {
      const { path, isValid } = action.payload;
      state.packageValidationResults[path] = isValid;
      state.isValidatingPackage = false;
    },
    setValidatingPackage: (state, action: PayloadAction<boolean>) => {
      state.isValidatingPackage = action.payload;
    },
    setWorkspaceExistenceResult: (state, action: PayloadAction<{ workspacePath: string; exists: boolean }>) => {
      const { workspacePath, exists } = action.payload;
      state.workspaceExistenceResults[workspacePath] = exists;
      state.isValidatingWorkspace = false;
    },
    setValidatingWorkspace: (state, action: PayloadAction<boolean>) => {
      state.isValidatingWorkspace = action.payload;
    },
    clearWorkspaceExistenceResults: (state) => {
      state.workspaceExistenceResults = {};
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },
    setComplete: (state, action: PayloadAction<boolean>) => {
      state.isComplete = action.payload;
    },
    resetState: (state, action: PayloadAction<{ preserveLogicAppData?: boolean } | undefined>) => {
      const preserveLogicAppData = action.payload?.preserveLogicAppData;
      const preservedLogicAppType = preserveLogicAppData ? state.logicAppType : '';
      const preservedLogicAppName = preserveLogicAppData ? state.logicAppName : '';
      const preservedSeparator = preserveLogicAppData ? state.separator : '/';
      const preservedPlatform = preserveLogicAppData ? state.platform : null;

      Object.assign(state, initialState);

      if (preserveLogicAppData) {
        state.logicAppType = preservedLogicAppType;
        state.logicAppName = preservedLogicAppName;
        state.separator = preservedSeparator;
        state.platform = preservedPlatform;
      }
    },
    nextStep: (state) => {
      if (state.currentStep < 7) {
        // Maximum of 8 steps (0-7) for custom code, 7 steps (0-6) for others
        state.currentStep += 1;
      }
    },
    previousStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
      }
    },
  },
});

export const {
  initializeProject,
  initializeWorkspace,
  setCurrentStep,
  setProjectPath,
  setPackagePath,
  setWorkspaceName,
  setIsDevContainerProject,
  setLogicAppType,
  setFunctionNamespace,
  setFunctionName,
  setFunctionFolderName,
  setWorkflowType,
  setWorkflowName,
  setTargetFramework,
  setLogicAppName,
  setProjectType,
  setSeparator,
  setOpenBehavior,
  setFlowType,
  setPathValidationResult,
  setPackageValidationResult,
  setValidatingPackage,
  setWorkspaceExistenceResult,
  setValidatingWorkspace,
  clearWorkspaceExistenceResults,
  setLoading,
  setError,
  setComplete,
  resetState,
} = createWorkspaceSlice.actions;

export const nextStep = createWorkspaceSlice.actions.nextStep as () => { type: string; payload: undefined };
export const previousStep = createWorkspaceSlice.actions.previousStep as () => { type: string; payload: undefined };

export default createWorkspaceSlice.reducer;
