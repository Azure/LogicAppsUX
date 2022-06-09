import Constants from '../../../../common/constants';
import { _getManifestBasedConnectionMapping } from '../../../actions/bjsworkflow/connections';
import type { OperationMetadataState } from '../../../state/operationMetadataSlice';
import type { RootState } from '../../../store';
import type { IOperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { InitOperationManifestService, StandardOperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import { createItem } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { ConnectionReferenceKeyFormat } from '@microsoft-logic-apps/utils';

const nodeId = '1';
const connectionName = 'name123';

describe('connection workflow mappings', () => {
  it('should get the correct connectionId for the node', async () => {
    InitOperationManifestService(makeMockStdOperationManifestService(ConnectionReferenceKeyFormat.OpenApi));
    const res = await _getManifestBasedConnectionMapping(mockGetState, nodeId, mockApiConnectionAction);
    if (res) {
      expect(res[nodeId]).toEqual(connectionName);
    }
  });

  it('should return undefined when there is no referenceKeyFormat', async () => {
    InitOperationManifestService(makeMockStdOperationManifestService(''));
    const result = await _getManifestBasedConnectionMapping(mockGetState, nodeId, mockApiConnectionAction);
    expect(result).toBeUndefined();
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

function makeMockStdOperationManifestService(referenceKeyFormat: ConnectionReferenceKeyFormat | ''): IOperationManifestService {
  class MockStdOperationManifestService extends StandardOperationManifestService {
    getOperationManifest(connectorId: string, operationId: string): Promise<OperationManifest> {
      const mockManifest = createItem;
      if (referenceKeyFormat) {
        mockManifest.properties.connectionReference = {
          referenceKeyFormat: referenceKeyFormat,
        };
      }
      return Promise.resolve(createItem);
    }
  }
  return new MockStdOperationManifestService({});
}
