import { useConnectionById } from '../../../../core/queries/connections';
import { openPanel } from '../../../../core/state/panel/panelSlice';
import { NodeLinkButton } from './nodeLinkButton';
import { Button, Text, Tooltip } from '@fluentui/react-components';
import { Open24Filled, ArrowSwap24Filled, CheckmarkCircle24Filled, ErrorCircle24Filled } from '@fluentui/react-icons';
import { getConnectionErrors } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface ConnectionEntryProps {
  connectorId: string;
  refId: string;
  connectionReference: any;
  brandColor?: string;
  iconUri?: string;
}

export const ConnectionEntry = ({ connectorId, refId, connectionReference, iconUri }: ConnectionEntryProps) => {
  const dispatch = useDispatch();

  const connection = useConnectionById(connectionReference.connection.id, connectorId);
  const nodeIds = useMemo(() => connectionReference.nodes || [], [connectionReference.nodes]);

  const errors = useMemo(() => {
    if (!connection?.result) return [];
    return getConnectionErrors(connection?.result);
  }, [connection]);

  const intl = useIntl();
  const openConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'Open connection',
    description: 'Tooltip for the button to open a connection',
  });
  const connectedActionsText = intl.formatMessage({
    defaultMessage: 'Connected actions',
    description: 'Header for the connected actions section',
  });
  const reassignConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'Reassign all connected actions to a new connection',
    description: 'Tooltip for the button to reassign actions',
  });
  const connectionValidStatusText = intl.formatMessage({
    defaultMessage: 'Connection is valid',
    description: 'Tooltip for the button to reassign actions',
  });
  const connectionInvalidStatusText = intl.formatMessage({
    defaultMessage: 'Connection is invalid',
    description: 'Tooltip for the button to reassign actions',
  });

  const onReassignButtonClick = useCallback(() => {
    dispatch(openPanel({ nodeIds, panelMode: 'Connection', referencePanelMode: 'Connection' }));
  }, [dispatch, nodeIds]);

  const statusIconComponent = useMemo(() => {
    const hasErrors = errors.length > 0;
    return (
      <Tooltip content={hasErrors ? connectionInvalidStatusText : connectionValidStatusText} relationship="label">
        {!hasErrors ? (
          <CheckmarkCircle24Filled className={'msla-connection-status-icon--success'} />
        ) : (
          <ErrorCircle24Filled className={'msla-connection-status-icon--error'} />
        )}
      </Tooltip>
    );
  }, [connectionInvalidStatusText, connectionValidStatusText, errors.length]);

  return (
    <div key={refId} className="msla-connector-connections-card-connection">
      <div className="msla-flex-header">
        {statusIconComponent}
        <Text size={300} weight="semibold" className="msla-flex-header-title">
          {connection?.result?.properties.displayName ?? refId}
        </Text>
        <Text size={300} className="msla-flex-header-subtitle">
          {connection?.result?.name}
        </Text>
        <Tooltip content={openConnectionTooltipText} relationship="label">
          <Button icon={<Open24Filled />} appearance="subtle" style={{ margin: '-6px', marginLeft: 'auto' }} />
        </Tooltip>
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <Text>{connectedActionsText}</Text>
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkButton key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
          <Tooltip content={reassignConnectionTooltipText} relationship="label">
            <Button icon={<ArrowSwap24Filled />} onClick={onReassignButtonClick} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
