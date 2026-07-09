import { MockHttpClient } from '../../../../__test__/mock-http-client';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import Constants from '../../../../common/constants';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import {
  getConnectionMappingForNode,
  getLegacyConnectionReferenceKey,
  getManifestBasedConnectionMapping,
  isOpenApiConnectionType,
  isConnectionRequiredForOperation,
  isConnectionAutoSelectionDisabled,
  getConnectionMetadata,
  needsConnection,
  updateNodeConnectionAndProperties,
} from '../../../actions/bjsworkflow/connections';
import connectionsReducer, { changeConnectionMapping } from '../../../state/connection/connectionSlice';
import workflowReducer, { setIsWorkflowDirty } from '../../../state/workflow/workflowSlice';
import type { RootState } from '../../../store';
import {
  InitOperationManifestService,
  StandardOperationManifestService,
  OperationManifestService,
  createItem,
  ConnectionReferenceKeyFormat,
  InitLoggerService,
} from '@microsoft/logic-apps-shared';
import type { LogicAppsV2, OperationManifest, Connector } from '@microsoft/logic-apps-shared';

const updateDynamicDataInNodeMock = vi.hoisted(() => vi.fn());

vi.mock('../../../utils/parameters/helper', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/parameters/helper')>()),
  updateDynamicDataInNode: updateDynamicDataInNodeMock,
}));

const nodeId = '1';
const connectionName = 'name123';
const mockHttp = new MockHttpClient();
const serviceOptions: any = {
  apiVersion: 'version',
  baseUrl: 'url',
  httpClient: mockHttp,
};

let spy: any;
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

beforeAll(() => {
  InitLoggerService([{ log: () => {} }]);
});

describe('connection workflow mappings', () => {
  afterEach(() => {
    if (spy) {
      spy.mockClear();
    }
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.resetModules();
    vi.restoreAllMocks();

    getReactQueryClient().clear();
  });

  it('should get the correct connectionId for OpenApi', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);
    const mockStdOperationManifestService = OperationManifestService();

    const res = await getConnectionMappingForNode(mockApiConnection, nodeId, false, mockStdOperationManifestService);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    } else {
      throw Error();
    }
  });

  it('should return undefined when there is no referenceKeyFormat', async () => {
    makeMockStdOperationManifestService('');
    const result = await getManifestBasedConnectionMapping(nodeId, false, mockOpenApiConnection);
    expect(result).toBeUndefined();
  });

  it('should get the correct connectionId for manifest', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);
    const mockStdOperationManifestService = OperationManifestService();
    vi.spyOn(StandardOperationManifestService.prototype, 'isSupported').mockImplementation((): boolean => {
      return true;
    });

    const res = await getConnectionMappingForNode(mockApiConnection, nodeId, false, mockStdOperationManifestService);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    } else {
      throw Error();
    }
  });

  it('should get the correct connectionId for the node with reference key', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);

    const res = await getManifestBasedConnectionMapping(nodeId, false, mockOpenApiConnection);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    }
  });

  it('should get correct key from legacy connection with explicit reference name', async () => {
    const mockLegacyConnection = {
      inputs: {
        host: {
          connection: {
            referenceName: '123',
          },
        },
      },
    };
    const key = getLegacyConnectionReferenceKey(mockLegacyConnection);
    expect(key).toEqual('123');
  });

  it('should get correct key from legacy connection without reference name', async () => {
    const mockLegacyConnection = {
      inputs: {
        host: {
          connection: '123',
        },
      },
    };
    const key = getLegacyConnectionReferenceKey(mockLegacyConnection);
    expect(key).toEqual('123');
  });
});

describe('connection update dirty state', () => {
  const connectorId = '/subscriptions/subscription/providers/Microsoft.Web/locations/westus/managedApis/test';
  const connectionId = '/subscriptions/subscription/resourceGroups/group/providers/Microsoft.Web/connections/connection-b';
  const updatePayload = {
    nodeId,
    connectorId,
    connectionId,
  };

  beforeEach(() => {
    updateDynamicDataInNodeMock.mockReset();
  });

  it('marks the mapping dirty before dynamic data loads and again after it settles', async () => {
    const deferredDynamicData = createDeferred<void>();
    updateDynamicDataInNodeMock.mockReturnValue(deferredDynamicData.promise);
    const harness = createConnectionUpdateHarness();

    const updatePromise = updateNodeConnectionAndProperties(updatePayload, harness.dispatch, harness.getState);

    const pendingState = harness.getState();
    const referenceKey = pendingState.connections.connectionsMapping[nodeId];
    expect(referenceKey).toBeTruthy();
    expect(pendingState.connections.connectionReferences[referenceKey as string].connection.id).toBe(connectionId);
    expect(pendingState.workflow.isDirty).toBe(true);
    expect(getDirtyActions(harness.actions)).toHaveLength(1);

    harness.dispatch(setIsWorkflowDirty(false));
    deferredDynamicData.resolve();
    await updatePromise;

    expect(harness.getState().workflow.isDirty).toBe(true);
    expect(getDirtyActions(harness.actions)).toHaveLength(2);
  });

  it('marks the connection change dirty again when dynamic data loading rejects', async () => {
    const deferredDynamicData = createDeferred<void>();
    updateDynamicDataInNodeMock.mockReturnValue(deferredDynamicData.promise);
    const harness = createConnectionUpdateHarness();

    const updatePromise = updateNodeConnectionAndProperties(updatePayload, harness.dispatch, harness.getState);
    harness.dispatch(setIsWorkflowDirty(false));
    deferredDynamicData.reject(new Error('Dynamic data failed.'));

    await expect(updatePromise).rejects.toThrow('Dynamic data failed.');
    expect(harness.getState().workflow.isDirty).toBe(true);
    expect(getDirtyActions(harness.actions)).toHaveLength(2);
  });

  it('does not mark initialization mapping actions dirty', () => {
    const mappingAction = changeConnectionMapping(updatePayload);

    const workflowState = workflowReducer(harnessInitialState().workflow, mappingAction);

    expect(workflowState.isDirty).toBe(false);
  });
});

const mockApiConnection: LogicAppsV2.OpenApiOperationAction = {
  type: Constants.NODE.TYPE.API_CONNECTION,
  inputs: {
    host: {
      apiId: '123',
      operationId: '2',
      connection: {
        referenceName: connectionName,
      },
    },
  },
};

const mockOpenApiConnection: LogicAppsV2.OpenApiOperationAction = {
  type: Constants.NODE.TYPE.OPEN_API_CONNECTION,
  inputs: {
    host: {
      apiId: '123',
      operationId: '2',
      connection: {
        referenceName: connectionName,
      },
    },
  },
};

describe('isOpenApiConnectionType', () => {
  it('should return true for OpenApiConnection type', () => {
    expect(isOpenApiConnectionType('OpenApiConnection')).toBe(true);
  });

  it('should return true for OpenApiConnectionWebhook type', () => {
    expect(isOpenApiConnectionType('OpenApiConnectionWebhook')).toBe(true);
  });

  it('should return true for OpenApiConnectionNotification type', () => {
    expect(isOpenApiConnectionType('OpenApiConnectionNotification')).toBe(true);
  });

  it('should return false for non-OpenApi types', () => {
    expect(isOpenApiConnectionType('ApiConnection')).toBe(false);
    expect(isOpenApiConnectionType('Http')).toBe(false);
    expect(isOpenApiConnectionType('')).toBe(false);
  });
});

describe('isConnectionRequiredForOperation', () => {
  it('should return true when connection is required', () => {
    const manifest = { properties: { connection: { required: true } } } as unknown as OperationManifest;
    expect(isConnectionRequiredForOperation(manifest)).toBe(true);
  });

  it('should return false when connection is not required', () => {
    const manifest = { properties: { connection: { required: false } } } as unknown as OperationManifest;
    expect(isConnectionRequiredForOperation(manifest)).toBe(false);
  });

  it('should return false when connection property is missing', () => {
    const manifest = { properties: {} } as unknown as OperationManifest;
    expect(isConnectionRequiredForOperation(manifest)).toBe(false);
  });
});

describe('isConnectionAutoSelectionDisabled', () => {
  it('should return true when auto selection is disabled', () => {
    const manifest = { properties: { connection: { disableAutoSelection: true } } } as unknown as OperationManifest;
    expect(isConnectionAutoSelectionDisabled(manifest)).toBe(true);
  });

  it('should return false when auto selection is enabled', () => {
    const manifest = { properties: { connection: { disableAutoSelection: false } } } as unknown as OperationManifest;
    expect(isConnectionAutoSelectionDisabled(manifest)).toBe(false);
  });

  it('should return false when connection property is missing', () => {
    const manifest = { properties: {} } as unknown as OperationManifest;
    expect(isConnectionAutoSelectionDisabled(manifest)).toBe(false);
  });
});

describe('getConnectionMetadata', () => {
  it('should return connection metadata', () => {
    const connection = { required: true, type: 'test' };
    const manifest = { properties: { connection } } as unknown as OperationManifest;
    expect(getConnectionMetadata(manifest)).toEqual(connection);
  });

  it('should return undefined when manifest is undefined', () => {
    expect(getConnectionMetadata(undefined)).toBeUndefined();
  });

  it('should return undefined when connection is not set', () => {
    const manifest = { properties: {} } as unknown as OperationManifest;
    expect(getConnectionMetadata(manifest)).toBeUndefined();
  });
});

describe('needsConnection', () => {
  it('should return false when connector is undefined', () => {
    expect(needsConnection(undefined)).toBe(false);
  });

  it('should return true when connector has empty properties (simple connection)', () => {
    const connector = { properties: {} } as unknown as Connector;
    expect(needsConnection(connector)).toBe(true);
  });
});

function makeMockStdOperationManifestService(referenceKeyFormat: ConnectionReferenceKeyFormat | '') {
  spy = vi
    .spyOn(StandardOperationManifestService.prototype, 'getOperationManifest')
    .mockImplementation((_connectorId: string, _operationId: string): Promise<OperationManifest> => {
      const mockManifest = { ...createItem };
      if (referenceKeyFormat) {
        mockManifest.properties.connectionReference = {
          referenceKeyFormat: referenceKeyFormat,
        };
      }
      return Promise.resolve(mockManifest);
    });
  InitOperationManifestService(new StandardOperationManifestService(serviceOptions));
}

function harnessInitialState(): RootState {
  const state = getMockedInitialRootState();
  return {
    ...state,
    connections: { ...state.connections, connectionsMapping: {}, connectionReferences: {} },
    operations: {
      ...state.operations,
      operationInfo: {
        ...state.operations.operationInfo,
        [nodeId]: {
          connectorId: 'connector-id',
          operationId: 'operation-id',
          type: Constants.NODE.TYPE.OPEN_API_CONNECTION,
        } as any,
      },
      dependencies: {
        ...state.operations.dependencies,
        [nodeId]: { inputs: {}, outputs: {} },
      },
    },
    workflow: { ...state.workflow, isDirty: false },
  };
}

function createConnectionUpdateHarness() {
  let state = harnessInitialState();
  const actions: any[] = [];
  const dispatch = (action: any) => {
    actions.push(action);
    state = {
      ...state,
      connections: connectionsReducer(state.connections, action),
      workflow: workflowReducer(state.workflow, action),
    };
    return action;
  };

  return {
    actions,
    dispatch,
    getState: () => state,
  };
}

function getDirtyActions(actions: any[]) {
  return actions.filter((action) => action.type === setIsWorkflowDirty.type && action.payload === true);
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
