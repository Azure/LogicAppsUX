import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import type { CreatedConnectionPayload } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getAssistedConnectionProps } from '../../../core/utils/connectors/connections';
import { updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';
import { useIntl } from 'react-intl';

export const CreateConnectionInTemplate = (props: {
  connectorId: string;
  connectionKey: string;
  onConnectionCreated: (connection: Connection) => void;
  onConnectionCancelled: () => void;
}) => {
  const intl = useIntl();
  const { connectorId, connectionKey, onConnectionCreated, onConnectionCancelled } = props;
  const dispatch = useDispatch<AppDispatch>();
  const { data: connector } = useConnector(connectorId);

  const { references, connections } = useSelector((state: RootState) => ({
    references: Object.keys(state.workflow.connections.references),
    connections: state.template.manifest?.connections,
  }));
  const isInAppConnector = equals(connections?.[connectionKey]?.kind, 'inapp');

  // TODO - Needs update to support azure resource selection for connections. Operation Manifest is required.
  const assistedConnectionProps = useMemo(() => (connector ? getAssistedConnectionProps(connector) : undefined), [connector]);

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      dispatch(updateTemplateConnection({ ...payload, nodeId: connectionKey }));
    },
    [connectionKey, dispatch]
  );

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Add connection',
    id: 'cwHxwb',
    description: 'Text for create connection button',
  });
  const description = intl.formatMessage(
    {
      defaultMessage: '{connectorName} connection',
      id: '0w/olE',
      description: 'Message to show in title for connection creation',
    },
    { connectorName: connector?.properties.displayName ?? '' }
  );

  return (
    <CreateConnectionInternal
      classes={{ root: 'msla-template-create-connection', content: 'msla-template-create-connection-content' }}
      connectionName={isInAppConnector ? connectionKey : undefined}
      connectorId={connectorId}
      createButtonText={createButtonText}
      description={description}
      operationType={isInAppConnector ? 'ServiceProvider' : 'ApiConnection'}
      existingReferences={references}
      assistedConnectionProps={assistedConnectionProps}
      showActionBar={false}
      hideCancelButton={false}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={onConnectionCreated}
      onConnectionCancelled={onConnectionCancelled}
    />
  );
};
