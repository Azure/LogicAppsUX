import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';

// Mock event-listener
vi.mock('@use-it/event-listener', () => ({
  __esModule: true,
  default: vi.fn(),
}));

// Mock designer store
vi.mock('@microsoft/logic-apps-designer', () => ({
  store: { dispatch: vi.fn() },
  resetDesignerDirtyState: vi.fn(),
}));

// Mock extension commands
vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    initialize: 'initialize',
    initialize_frame: 'initialize_frame',
    update_runtime_base_url: 'update_runtime_base_url',
    receiveCallback: 'receiveCallback',
    completeFileSystemConnection: 'completeFileSystemConnection',
    update_panel_metadata: 'update_panel_metadata',
    resetDesignerDirtyState: 'resetDesignerDirtyState',
    getDesignerVersion: 'getDesignerVersion',
    getDataMapperVersion: 'getDataMapperVersion',
    setRuntimePort: 'setRuntimePort',
    fetchSchema: 'fetchSchema',
    loadDataMap: 'loadDataMap',
    showAvailableSchemas: 'showAvailableSchemas',
    showAvailableSchemasV2: 'showAvailableSchemasV2',
    getAvailableCustomXsltPaths: 'getAvailableCustomXsltPaths',
    getAvailableCustomXsltPathsV2: 'getAvailableCustomXsltPathsV2',
    setXsltData: 'setXsltData',
    getConfigurationSetting: 'getConfigurationSetting',
    isTestDisabledForOS: 'isTestDisabledForOS',
    update_access_token: 'update_access_token',
    update_export_path: 'update_export_path',
    update_workspace_path: 'update_workspace_path',
    update_package_path: 'update_package_path',
    workspace_existence_result: 'workspace_existence_result',
    package_existence_result: 'package_existence_result',
    validatePath: 'validatePath',
    add_status: 'add_status',
    set_final_status: 'set_final_status',
    update_callback_info: 'update_callback_info',
  },
  ProjectName: {
    designer: 'designer',
    dataMapper: 'dataMapper',
    createWorkspace: 'createWorkspace',
    createWorkspaceFromPackage: 'createWorkspaceFromPackage',
    createWorkspaceStructure: 'createWorkspaceStructure',
    createLogicApp: 'createLogicApp',
  },
}));

import projectReducer from '../state/projectSlice';
import { designerSlice } from '../state/DesignerSlice';
import workflowReducer from '../state/WorkflowSlice';
import dataMapReducer from '../state/DataMapSlice';
import dataMapV2Reducer from '../state/DataMapSliceV2';
import createWorkspaceReducer from '../state/createWorkspaceSlice';

import { WebViewCommunication, VSCodeContext } from '../webviewCommunication';

const createTestStore = () =>
  configureStore({
    reducer: {
      project: projectReducer,
      designer: designerSlice.reducer,
      workflow: workflowReducer,
      dataMapDataLoader: dataMapReducer,
      dataMap: dataMapV2Reducer,
      createWorkspace: createWorkspaceReducer,
    },
  });

describe('WebViewCommunication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children and provide VSCode context', () => {
    const store = createTestStore();
    const { getByText } = render(
      <Provider store={store}>
        <WebViewCommunication>
          <div>Test Content</div>
        </WebViewCommunication>
      </Provider>
    );
    expect(getByText('Test Content')).toBeDefined();
  });

  it('should export VSCodeContext', () => {
    expect(VSCodeContext).toBeDefined();
  });

  it('should export WebViewCommunication component', () => {
    expect(WebViewCommunication).toBeDefined();
    expect(typeof WebViewCommunication).toBe('function');
  });
});
