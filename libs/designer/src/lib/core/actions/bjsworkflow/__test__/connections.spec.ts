import Constants from '../../../../common/constants';
import {
  getConnectionMappingForNode,
  getLegacyConnectionReferenceKey,
  getManifestBasedConnectionMapping,
} from '../../../actions/bjsworkflow/connections';
import type { OperationMetadataState } from '../../../state/operationMetadataSlice';
import type { RootState } from '../../../store';
import type { StandardOperationManifestServiceOptions, IHttpClient } from '@microsoft-logic-apps/designer-client-services';
import {
  InitOperationManifestService,
  StandardOperationManifestService,
  OperationManifestService,
} from '@microsoft-logic-apps/designer-client-services';
import { createItem } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat } from '@microsoft-logic-apps/utils';

class MockHttpClient implements IHttpClient {
  dispose() {
    return;
  }
  get<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
  post<ReturnType>() {
    const a: unknown = {};
    return a as ReturnType;
  }
}

const nodeId = '1';
const connectionName = 'name123';
const mockHttp = new MockHttpClient();
const serviceOptions: StandardOperationManifestServiceOptions = {
  apiVersion: 'version',
  baseUrl: 'url',
  httpClient: mockHttp,
};

describe('connection workflow mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get the correct connectionId for OpenApi', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);
    const mockStdOperationManifestService = OperationManifestService();

    const res = await getConnectionMappingForNode(mockApiConnection, nodeId, mockStdOperationManifestService, mockGetState);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    } else {
      throw Error();
    }
  });

  it('should get the correct connectionId for manifest', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);
    const mockStdOperationManifestService = OperationManifestService();
    jest.spyOn(StandardOperationManifestService.prototype, 'isSupported').mockImplementation((): boolean => {
      return true;
    });

    const res = await getConnectionMappingForNode(mockApiConnection, nodeId, mockStdOperationManifestService, mockGetState);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    } else {
      throw Error();
    }
  });

  it('should throw an error when there is no referenceKeyFormat', async () => {
    makeMockStdOperationManifestService('');
    expect(await getManifestBasedConnectionMapping(mockGetState, nodeId, mockOpenApiConnection)).toThrowError();
  });

  it('should get the correct connectionId for the node with reference key', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);

    const res = await getManifestBasedConnectionMapping(mockGetState, nodeId, mockOpenApiConnection);
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

const mockGetState = (): RootState => {
  const state: Partial<OperationMetadataState> = {
    operationInfo: { [nodeId]: { connectorId: '1', operationId: '2' } },
  };
  return { operations: state as OperationMetadataState } as RootState;
};

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

function makeMockStdOperationManifestService(referenceKeyFormat: ConnectionReferenceKeyFormat | '') {
  jest
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
