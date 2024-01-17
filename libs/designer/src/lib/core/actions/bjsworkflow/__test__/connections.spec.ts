import { MockHttpClient } from '../../../../__test__/mock-http-client';
import Constants from '../../../../common/constants';
import { getReactQueryClient } from '../../../ReactQueryProvider';
import {
  getConnectionMappingForNode,
  getLegacyConnectionReferenceKey,
  getManifestBasedConnectionMapping,
} from '../../../actions/bjsworkflow/connections';
import {
  InitOperationManifestService,
  StandardOperationManifestService,
  OperationManifestService,
} from '@microsoft/designer-client-services-logic-apps';
import { createItem } from '@microsoft/parsers-logic-apps';
import type { LogicAppsV2, OperationManifest } from '@microsoft/utils-logic-apps';
import { ConnectionReferenceKeyFormat } from '@microsoft/utils-logic-apps';

const nodeId = '1';
const connectionName = 'name123';
const mockHttp = new MockHttpClient();
const serviceOptions: any = {
  apiVersion: 'version',
  baseUrl: 'url',
  httpClient: mockHttp,
};

let spy: any;

describe('connection workflow mappings', () => {
  afterEach(() => {
    if (spy) {
      spy.mockClear();
    }
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.resetModules();
    jest.restoreAllMocks();

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
    jest.spyOn(StandardOperationManifestService.prototype, 'isSupported').mockImplementation((): boolean => {
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
  spy = jest
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
