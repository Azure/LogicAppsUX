import { describe, it, expect, vi } from 'vitest';
import { designerSlice } from '../DesignerSlice';
import type { DesignerState } from '../DesignerSlice';
import {
  initializeDesigner,
  loadDraftState,
  updateDraftSaveResult,
  setDraftSaving,
  updateDraftWorkflow,
  updateDraftConnections,
  updateDraftParameters,
  setDraftMode,
  clearDraftState,
  updateRuntimeBaseUrl,
  updateCallbackUrl,
  updatePanelMetadata,
  createFileSystemConnection,
  updateFileSystemConnection,
  updateUnitTestDefinition,
} from '../DesignerSlice';

const reducer = designerSlice.reducer;

const getInitialState = (): DesignerState => ({
  panelMetaData: null,
  baseUrl: '/url',
  workflowRuntimeBaseUrl: '',
  apiVersion: '2018-11-01',
  connectionData: {},
  apiHubServiceDetails: {
    apiVersion: '2018-07-01-preview',
    baseUrl: '/url',
    subscriptionId: 'subscriptionId',
    resourceGroup: '',
    location: '',
    tenantId: '',
    httpClient: null as any,
  },
  readOnly: false,
  isLocal: true,
  isMonitoringView: false,
  callbackInfo: { value: '', method: '' },
  runId: '',
  fileSystemConnections: {},
  iaMapArtifacts: [],
  oauthRedirectUrl: '',
  hostVersion: '',
  isUnitTest: false,
  unitTestDefinition: null,
  isDraftMode: true,
  hasDraft: false,
  draftWorkflow: null,
  draftConnections: null,
  draftParameters: null,
  lastDraftSaveTime: null,
  draftSaveError: null,
  isDraftSaving: false,
});

const mockDraftWorkflow = { triggers: {}, actions: { action1: { type: 'Http' } } };
const mockDraftConnections = { conn1: { api: { id: '/providers/test' }, connection: { id: '/connections/conn1' } } };
const mockDraftParameters = { param1: { type: 'String', value: 'hello' } };

describe('DesignerSlice - core reducers', () => {
  describe('updateRuntimeBaseUrl', () => {
    it('should update workflowRuntimeBaseUrl', () => {
      const result = reducer(getInitialState(), updateRuntimeBaseUrl('https://new-runtime.test.com'));
      expect(result.workflowRuntimeBaseUrl).toBe('https://new-runtime.test.com');
    });

    it('should set empty string when payload is undefined', () => {
      const state = { ...getInitialState(), workflowRuntimeBaseUrl: 'https://old.com' };
      const result = reducer(state, updateRuntimeBaseUrl(undefined));
      expect(result.workflowRuntimeBaseUrl).toBe('');
    });
  });

  describe('updateCallbackUrl', () => {
    it('should update callbackInfo from payload', () => {
      const callbackInfo = { value: 'https://callback.test.com/trigger', method: 'POST' };
      const result = reducer(getInitialState(), updateCallbackUrl({ callbackInfo }));
      expect(result.callbackInfo).toEqual(callbackInfo);
    });
  });

  describe('updatePanelMetadata', () => {
    it('should update panelMetaData, connectionData, and apiHubServiceDetails', () => {
      const panelMetadata = { standardApp: { definition: { triggers: {} } } } as any;
      const connectionData = { conn1: { api: { id: '/test' } } } as any;
      const apiHubServiceDetails = {
        apiVersion: '2020-06-01',
        baseUrl: 'https://hub.test.com',
        subscriptionId: 'sub-123',
        resourceGroup: 'rg',
        location: 'eastus',
        tenantId: 'tenant-123',
        httpClient: null as any,
      };

      const result = reducer(getInitialState(), updatePanelMetadata({ panelMetadata, connectionData, apiHubServiceDetails }));

      expect(result.panelMetaData).toEqual(panelMetadata);
      expect(result.connectionData).toEqual(connectionData);
      expect(result.apiHubServiceDetails).toEqual(apiHubServiceDetails);
    });
  });

  describe('createFileSystemConnection', () => {
    it('should store resolve and reject callbacks for the connection', () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const result = reducer(getInitialState(), createFileSystemConnection({ connectionName: 'myConn', resolve, reject }));

      expect(result.fileSystemConnections['myConn']).toBeDefined();
      expect(result.fileSystemConnections['myConn'].resolveConnection).toBe(resolve);
      expect(result.fileSystemConnections['myConn'].rejectConnection).toBe(reject);
    });
  });

  describe('updateFileSystemConnection', () => {
    it('should resolve the connection and remove it from state', () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const state = {
        ...getInitialState(),
        fileSystemConnections: { myConn: { resolveConnection: resolve, rejectConnection: reject } },
      };
      const connection = { id: '/connections/myConn', name: 'myConn' };

      const result = reducer(state, updateFileSystemConnection({ connectionName: 'myConn', connection } as any));

      expect(resolve).toHaveBeenCalledWith(connection);
      expect(reject).not.toHaveBeenCalled();
      expect(result.fileSystemConnections['myConn']).toBeUndefined();
    });

    it('should reject the connection on error and remove it from state', () => {
      const resolve = vi.fn();
      const reject = vi.fn();
      const state = {
        ...getInitialState(),
        fileSystemConnections: { myConn: { resolveConnection: resolve, rejectConnection: reject } },
      };

      const result = reducer(state, updateFileSystemConnection({ connectionName: 'myConn', error: 'Connection failed' } as any));

      expect(reject).toHaveBeenCalledWith({ message: 'Connection failed' });
      expect(resolve).not.toHaveBeenCalled();
      expect(result.fileSystemConnections['myConn']).toBeUndefined();
    });
  });

  describe('updateUnitTestDefinition', () => {
    it('should update unitTestDefinition', () => {
      const unitTestDefinition = {
        triggerMocks: { manual: { outputs: {} } },
        actionMocks: {},
        assertions: [{ name: 'test', description: '', expression: { operand1: '', operator: 'equals', operand2: '' } }],
      } as any;

      const result = reducer(getInitialState(), updateUnitTestDefinition({ unitTestDefinition }));

      expect(result.unitTestDefinition).toEqual(unitTestDefinition);
    });
  });
});

describe('DesignerSlice - draft reducers', () => {
  describe('initializeDesigner', () => {
    const basePayload = {
      panelMetadata: { standardApp: { definition: {} } },
      connectionData: {},
      baseUrl: 'https://test.com',
      apiVersion: '2018-11-01',
      apiHubServiceDetails: {},
      readOnly: false,
      isLocal: true,
      oauthRedirectUrl: '',
      isMonitoringView: false,
      runId: '',
      hostVersion: '1.0.0',
      isUnitTest: false,
      unitTestDefinition: null,
      workflowRuntimeBaseUrl: 'https://runtime.test.com',
    };

    it('should set hasDraft and draft artifacts when draftInfo is provided', () => {
      const payload = {
        ...basePayload,
        draftInfo: {
          hasDraft: true,
          draftWorkflow: mockDraftWorkflow,
          draftConnections: mockDraftConnections,
          draftParameters: mockDraftParameters,
        },
      };

      const result = reducer(getInitialState(), initializeDesigner(payload));

      expect(result.hasDraft).toBe(true);
      expect(result.isDraftMode).toBe(true);
      expect(result.draftWorkflow).toEqual(mockDraftWorkflow);
      expect(result.draftConnections).toEqual(mockDraftConnections);
      expect(result.draftParameters).toEqual(mockDraftParameters);
    });

    it('should set hasDraft false when draftInfo has no draft', () => {
      const payload = {
        ...basePayload,
        draftInfo: { hasDraft: false },
      };

      const result = reducer(getInitialState(), initializeDesigner(payload));

      expect(result.hasDraft).toBe(false);
      expect(result.isDraftMode).toBe(true);
      expect(result.draftWorkflow).toBeNull();
      expect(result.draftConnections).toBeNull();
      expect(result.draftParameters).toBeNull();
    });

    it('should reset draft state when draftInfo is undefined', () => {
      const stateWithDraft = {
        ...getInitialState(),
        hasDraft: true,
        draftWorkflow: mockDraftWorkflow,
        draftConnections: mockDraftConnections,
      };

      const result = reducer(stateWithDraft, initializeDesigner(basePayload));

      expect(result.hasDraft).toBe(false);
      expect(result.isDraftMode).toBe(true);
      expect(result.draftWorkflow).toBeNull();
      expect(result.draftConnections).toBeNull();
      expect(result.draftParameters).toBeNull();
    });

    it('should handle draftInfo with partial artifacts', () => {
      const payload = {
        ...basePayload,
        draftInfo: {
          hasDraft: true,
          draftWorkflow: mockDraftWorkflow,
          // No connections or parameters
        },
      };

      const result = reducer(getInitialState(), initializeDesigner(payload));

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toEqual(mockDraftWorkflow);
      expect(result.draftConnections).toBeNull();
      expect(result.draftParameters).toBeNull();
    });
  });

  describe('loadDraftState', () => {
    it('should set all draft fields from payload', () => {
      const result = reducer(
        getInitialState(),
        loadDraftState({
          hasDraft: true,
          draftWorkflow: mockDraftWorkflow,
          draftConnections: mockDraftConnections,
          draftParameters: mockDraftParameters,
        })
      );

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toEqual(mockDraftWorkflow);
      expect(result.draftConnections).toEqual(mockDraftConnections);
      expect(result.draftParameters).toEqual(mockDraftParameters);
    });

    it('should set null for missing optional fields', () => {
      const result = reducer(getInitialState(), loadDraftState({ hasDraft: true }));

      expect(result.hasDraft).toBe(true);
      expect(result.draftWorkflow).toBeNull();
      expect(result.draftConnections).toBeNull();
      expect(result.draftParameters).toBeNull();
    });
  });

  describe('updateDraftSaveResult', () => {
    it('should update timestamp and clear error on success', () => {
      const state = { ...getInitialState(), isDraftSaving: true, draftSaveError: 'old error' };

      const result = reducer(state, updateDraftSaveResult({ success: true, timestamp: 1234567890 }));

      expect(result.isDraftSaving).toBe(false);
      expect(result.lastDraftSaveTime).toBe(1234567890);
      expect(result.draftSaveError).toBeNull();
      expect(result.hasDraft).toBe(true);
    });

    it('should set error on failure', () => {
      const state = { ...getInitialState(), isDraftSaving: true };

      const result = reducer(state, updateDraftSaveResult({ success: false, timestamp: 0, error: 'Save failed' }));

      expect(result.isDraftSaving).toBe(false);
      expect(result.draftSaveError).toBe('Save failed');
    });

    it('should set default error message when error is undefined on failure', () => {
      const state = { ...getInitialState(), isDraftSaving: true };

      const result = reducer(state, updateDraftSaveResult({ success: false, timestamp: 0 }));

      expect(result.draftSaveError).toBe('Unknown error');
    });
  });

  describe('setDraftSaving', () => {
    it('should set isDraftSaving to true', () => {
      const result = reducer(getInitialState(), setDraftSaving(true));
      expect(result.isDraftSaving).toBe(true);
    });

    it('should set isDraftSaving to false', () => {
      const state = { ...getInitialState(), isDraftSaving: true };
      const result = reducer(state, setDraftSaving(false));
      expect(result.isDraftSaving).toBe(false);
    });
  });

  describe('updateDraftWorkflow', () => {
    it('should update draftWorkflow', () => {
      const result = reducer(getInitialState(), updateDraftWorkflow(mockDraftWorkflow));
      expect(result.draftWorkflow).toEqual(mockDraftWorkflow);
    });
  });

  describe('updateDraftConnections', () => {
    it('should update draftConnections', () => {
      const result = reducer(getInitialState(), updateDraftConnections(mockDraftConnections));
      expect(result.draftConnections).toEqual(mockDraftConnections);
    });
  });

  describe('updateDraftParameters', () => {
    it('should update draftParameters', () => {
      const result = reducer(getInitialState(), updateDraftParameters(mockDraftParameters));
      expect(result.draftParameters).toEqual(mockDraftParameters);
    });
  });

  describe('setDraftMode', () => {
    it('should set isDraftMode to true', () => {
      const state = { ...getInitialState(), isDraftMode: false };
      const result = reducer(state, setDraftMode(true));
      expect(result.isDraftMode).toBe(true);
    });

    it('should set isDraftMode to false', () => {
      const result = reducer(getInitialState(), setDraftMode(false));
      expect(result.isDraftMode).toBe(false);
    });
  });

  describe('clearDraftState', () => {
    it('should reset all draft fields to defaults', () => {
      const dirtyState: DesignerState = {
        ...getInitialState(),
        hasDraft: true,
        isDraftMode: false,
        draftWorkflow: mockDraftWorkflow,
        draftConnections: mockDraftConnections,
        draftParameters: mockDraftParameters,
        lastDraftSaveTime: 9999999,
        draftSaveError: 'some error',
        isDraftSaving: true,
      };

      const result = reducer(dirtyState, clearDraftState());

      expect(result.hasDraft).toBe(false);
      expect(result.isDraftMode).toBe(true);
      expect(result.draftWorkflow).toBeNull();
      expect(result.draftConnections).toBeNull();
      expect(result.draftParameters).toBeNull();
      expect(result.lastDraftSaveTime).toBeNull();
      expect(result.draftSaveError).toBeNull();
      expect(result.isDraftSaving).toBe(false);
    });

    it('should preserve non-draft state fields', () => {
      const state: DesignerState = {
        ...getInitialState(),
        baseUrl: 'https://custom.com',
        isLocal: false,
        hasDraft: true,
        draftWorkflow: mockDraftWorkflow,
      };

      const result = reducer(state, clearDraftState());

      expect(result.baseUrl).toBe('https://custom.com');
      expect(result.isLocal).toBe(false);
      expect(result.hasDraft).toBe(false);
      expect(result.draftWorkflow).toBeNull();
    });
  });
});
