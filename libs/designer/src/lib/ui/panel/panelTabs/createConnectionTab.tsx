import constants from '../../../common/constants';
import type { ConnectionReference } from '../../../common/models/workflow';
import { getConnectionMetadata } from '../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId } from '../../../core/state/connection/connectionSelector';
import { addConnectionReference, changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import type { ConnectionParameterSet, ConnectionParameterSetValues, ConnectionType } from '@microsoft-logic-apps/utils';
import { CreateConnection, getIdLeaf } from '@microsoft/designer-ui';
import type { PanelTab } from '@microsoft/designer-ui';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

const CreateConnectionTab = () => {
  const dispatch = useDispatch();

  const nodeId: string = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (connector === undefined) dispatch(showDefaultTabs());
  }, [connector, dispatch]);

  const createConnectionCallback = useCallback(
    async (newName: string, selectedParameterSet?: ConnectionParameterSet, parameterValues: Record<string, any> = {}) => {
      const connectionParameterSetValues: ConnectionParameterSetValues = {
        name: selectedParameterSet?.name ?? '',
        values: Object.keys(parameterValues).reduce((acc: any, key) => {
          // eslint-disable-next-line no-param-reassign
          acc[key] = { value: parameterValues[key] };
          return acc;
        }, {}),
      };
      const connectionInfo: ConnectionCreationInfo = {
        displayName: newName,
        connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
        connectionParameters: parameterValues,
      };

      const parametersMetadata: ConnectionParametersMetadata = {
        connectionType: connectionMetadata?.type as ConnectionType,
        connectionParameterSet: selectedParameterSet,
        connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
      };

      setIsLoading(true);
      const newConnection = await ConnectionService().createConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata);

      const connectionId = getIdLeaf(newConnection?.id);
      const connectionReference: ConnectionReference = {
        api: { id: connector?.id ?? '' },
        connection: { id: connectionId },
        connectionName: newName,
      };
      dispatch(changeConnectionMapping({ nodeId, connectionId }));
      dispatch(addConnectionReference({ connectionId, connectionReference }));
      dispatch(showDefaultTabs());
      setIsLoading(false);
    },
    [connectionMetadata, connector, dispatch, nodeId]
  );

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  // By the time you get to this component, there should always be a connector associated
  if (connector === undefined) return <p></p>;

  return (
    <CreateConnection
      connectorDisplayName={connector.properties.displayName}
      connectionParameters={connector.properties.connectionParameters}
      connectionParameterSets={connector.properties.connectionParameterSets}
      createConnectionCallback={createConnectionCallback}
      isLoading={isLoading}
      cancelCallback={cancelCallback}
    />
  );
};

export const createConnectionTab: PanelTab = {
  title: 'Create Connection',
  name: constants.PANEL_TAB_NAMES.CONNECTION_CREATE,
  description: 'Create Connection Tab',
  visible: true,
  content: <CreateConnectionTab />,
  order: 0,
};
