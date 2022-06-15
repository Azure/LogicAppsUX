import Constants from '../../../../common/constants';
import { getManifestBasedConnectionMapping } from '../../../actions/bjsworkflow/connections';
import type { OperationMetadataState } from '../../../state/operationMetadataSlice';
import type { RootState } from '../../../store';
import type { StandardOperationManifestServiceOptions, IHttpClient } from '@microsoft-logic-apps/designer-client-services';
import { InitOperationManifestService, StandardOperationManifestService } from '@microsoft-logic-apps/designer-client-services';
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

  it('should return undefined when there is no referenceKeyFormat', async () => {
    makeMockStdOperationManifestService('');
    const result = await getManifestBasedConnectionMapping(mockGetState, nodeId, mockApiConnectionAction);
    expect(result).toBeUndefined();
  });

  it('should get the correct connectionId for the node', async () => {
    makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi);

    const res = await getManifestBasedConnectionMapping(mockGetState, nodeId, mockApiConnectionAction);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    }
  });
});

const mockGetState = (): RootState => {
  const state: Partial<OperationMetadataState> = {
    operationInfo: { [nodeId]: { connectorId: '1', operationId: '2' } },
  };
  return { operations: state as OperationMetadataState } as RootState;
};

const mockApiConnectionAction: LogicAppsV2.OpenApiOperationAction = {
  type: Constants.NODE.TYPE.OPEN_API_CONNECTION,
  inputs: {
    host: {
      apiId: '123',
      operationId: '2',
      connection: {
        name: connectionName,
      },
    },
  },
};

function makeMockStdOperationManifestService(referenceKeyFormat: ConnectionReferenceKeyFormat | '') {
  jest
    .spyOn(StandardOperationManifestService.prototype, 'getOperationManifest')
    .mockImplementation((_connectorId: string, _operationId: string): Promise<OperationManifest> => {
      const mockManifest = createItem;
      if (referenceKeyFormat) {
        mockManifest.properties.connectionReference = {
          referenceKeyFormat: referenceKeyFormat,
        };
      }
      return Promise.resolve(createItem);
    });
  InitOperationManifestService(new StandardOperationManifestService(serviceOptions));
}
