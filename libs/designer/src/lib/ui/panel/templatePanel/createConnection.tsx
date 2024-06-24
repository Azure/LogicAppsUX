import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import type { CreatedConnectionPayload } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { useConnectorOnly } from '../../../core/state/connection/connectionSelector';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getAssistedConnectionProps } from '../../../core/utils/connectors/connections';
import { updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';

export const CreateConnectionInTemplate = (props: {
  connectorId: string;
  connectionKey: string;
  onConnectionCreated: (connection: Connection) => void;
}) => {
  const { connectorId, connectionKey, onConnectionCreated } = props;
  const dispatch = useDispatch<AppDispatch>();
  const { data: connector } = useConnectorOnly(connectorId);

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

  return (
    <CreateConnectionInternal
      connectorId={connectorId}
      operationType={isInAppConnector ? 'ServiceProvider' : 'ApiConnection'}
      existingReferences={references}
      assistedConnectionProps={assistedConnectionProps}
      showActionBar={false}
      hideCancelButton={true}
      updateConnectionInState={updateConnectionInState}
      onConnectionCreated={onConnectionCreated}
    />
  );
};
