import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection } from '@microsoft/logic-apps-shared';
import { equals } from '@microsoft/logic-apps-shared';
import type { CreatedConnectionPayload } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { CreateConnectionInternal } from '../connectionsPanel/createConnection/createConnectionWrapper';
import { useConnectorOnly } from '../../../core/state/connection/connectionSelector';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { getAssistedConnectionProps } from '../../../core/utils/connectors/connections';
import { updateTemplateConnection } from '../../../core/actions/bjsworkflow/connections';
import { useIntl } from 'react-intl';
import { Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { Link } from '@fluentui/react';

export const CreateConnectionInTemplate = (props: {
  connectorId: string;
  connectionKey: string;
  onConnectionCreateClick: () => void;
  onConnectionCreated: (connection: Connection) => void;
  disabled: boolean;
}) => {
  const intl = useIntl();
  const { connectorId, connectionKey, onConnectionCreated, onConnectionCreateClick, disabled } = props;
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

  const [isOpen, setIsOpen] = useState(false);

  const description = intl.formatMessage(
    {
      defaultMessage: 'Fill out the fields below to create a connection for {connectorName}',
      id: 'N+qRUv',
      description: 'Message to show in title for connection creation',
    },
    { connectorName: connector?.properties.displayName ?? '' }
  );
  return (
    <Popover onOpenChange={(_, data) => setIsOpen(data.open)} open={isOpen} withArrow={true} positioning="below">
      <PopoverTrigger disableButtonEnhancement={true}>
        <Link className="msla-template-connection-text" disabled={disabled} onClick={onConnectionCreateClick}>
          {intl.formatMessage({ defaultMessage: 'Connect', description: 'Link to create a connection', id: 'yQ6+nV' })}
        </Link>
      </PopoverTrigger>
      <PopoverSurface>
        <CreateConnectionInternal
          classes={{ root: 'msla-template-create-connection', content: 'msla-template-create-connection-content' }}
          connectionName={isInAppConnector ? connectionKey : undefined}
          connectorId={connectorId}
          description={description}
          operationType={isInAppConnector ? 'ServiceProvider' : 'ApiConnection'}
          existingReferences={references}
          assistedConnectionProps={assistedConnectionProps}
          showActionBar={false}
          hideCancelButton={false}
          updateConnectionInState={updateConnectionInState}
          onConnectionCreated={onConnectionCreated}
          onConnectionCancelled={() => {
            setIsOpen(false);
          }}
        />
      </PopoverSurface>
    </Popover>
  );
};
