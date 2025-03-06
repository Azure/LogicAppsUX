import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection } from '@microsoft/logic-apps-shared';
import { equals, getUniqueName } from '@microsoft/logic-apps-shared';
import type { CreatedConnectionPayload } from '../../panel/connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../../panel/connectionsPanel/createConnection/createConnectionWrapper';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getAssistedConnectionProps } from '../../../core/utils/connectors/connections';
import { updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';
import { useIntl } from 'react-intl';
import { useConnector } from '../../../core/state/connection/connectionSelector';

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
    connections: state.template.connections,
  }));
  const isInAppConnector = equals(connections?.[connectionKey]?.kind, 'inapp');
  const uniqueConnectionKey = isInAppConnector ? getUniqueName(references, connectionKey).name : undefined;

  // TODO - Needs update to support azure resource selection for connections. Operation Manifest is required.
  const assistedConnectionProps = useMemo(() => (connector ? getAssistedConnectionProps(connector) : undefined), [connector]);

  const updateConnectionInState = useCallback(
    (payload: CreatedConnectionPayload) => {
      dispatch(updateTemplateConnection({ ...payload, nodeId: connectionKey, connectionKey: uniqueConnectionKey ?? connectionKey }));
    },
    [connectionKey, dispatch, uniqueConnectionKey]
  );

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Add connection',
    id: 'ms7301f1c1b365',
    description: 'Text for create connection button',
  });
  const description = intl.formatMessage(
    {
      defaultMessage: '{connectorName} connection',
      id: 'msd30fe8944a30',
      description: 'Message to show in title for connection creation',
    },
    { connectorName: connector?.properties.displayName ?? '' }
  );

  return (
    <CreateConnectionInternal
      classes={{ root: 'msla-template-create-connection', content: 'msla-template-create-connection-content' }}
      connectorId={connectorId}
      createButtonText={createButtonText}
      description={description}
      connectionName={uniqueConnectionKey}
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
