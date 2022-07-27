import constants from '../../../common/constants';
import { getConnectionMetadata } from '../../../core/actions/bjsworkflow/connections';
import { useConnectorByNodeId } from '../../../core/state/connection/connectionSelector';
import { changeConnectionMapping } from '../../../core/state/connection/connectionSlice';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useOperationInfo, useOperationManifest } from '../../../core/state/selectors/actionMetadataSelector';
import type { ConnectionCreationInfo, ConnectionParametersMetadata } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import type { ConnectionParameterSet, ConnectionParameterSetValues, ConnectionType } from '@microsoft-logic-apps/utils';
import type { PanelTab } from '@microsoft/designer-ui';
import { CreateConnection } from '@microsoft/designer-ui';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

const CreateConnectionTab = () => {
  const dispatch = useDispatch();

  const nodeId: string = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);

  const [isLoading, setIsLoading] = useState(false);

  const createConnectionCallback = useCallback(
    async (id: string, selectedParameterSet?: ConnectionParameterSet, parameterValues?: Record<string, any>) => {
      // Create the connection

      const connectionParameterSetValues: ConnectionParameterSetValues = {
        name: selectedParameterSet?.name ?? '',
        values: Object.keys(parameterValues ?? {}).reduce((acc: any, key) => {
          // eslint-disable-next-line no-param-reassign
          acc[key] = { value: parameterValues?.[key] };
          return acc;
        }, {}),
      };
      const connectionInfo: ConnectionCreationInfo = {
        displayName: id,
        connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
        connectionParameters: parameterValues,
      };

      const parametersMetadata: ConnectionParametersMetadata = {
        connectionType: connectionMetadata?.type as ConnectionType,
        connectionParameterSet: selectedParameterSet,
        connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
      };

      setIsLoading(true);
      const newConnection = await ConnectionService().createConnection(id, connector?.id ?? '', connectionInfo, parametersMetadata);

      dispatch(changeConnectionMapping({ nodeId, connectionId: newConnection.id }));
      dispatch(showDefaultTabs());
      setIsLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connector, dispatch]
  );

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  // By the time you get to this component, there should always be a connector associated
  if (connector === undefined) {
    dispatch(showDefaultTabs());
    return <p></p>;
  }

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
