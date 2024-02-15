import { useConnectionById } from '../../../../core/queries/connections';
import { openPanel } from '../../../../core/state/panel/panelSlice';
import { NodeLinkButton } from './nodeLinkButton';
import { css } from '@fluentui/react';
import { Button, Spinner, Text, Tooltip } from '@fluentui/react-components';
import {
  Open24Filled,
  ArrowSwap24Filled,
  CheckmarkCircle24Filled,
  ErrorCircle24Filled,
  PlugDisconnected24Filled,
} from '@fluentui/react-icons';
import { HostService } from '@microsoft/logic-apps-shared';
import { getConnectionErrors } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface ConnectionEntryProps {
  connectorId: string;
  refId?: string;
  connectionReference?: any;
  brandColor?: string;
  iconUri?: string;
  disconnectedNodeIds?: string[];
}

export const ConnectionEntry = ({ connectorId, refId, connectionReference, iconUri, disconnectedNodeIds = [] }: ConnectionEntryProps) => {
  const dispatch = useDispatch();

  const connection = useConnectionById(connectionReference?.connection?.id, connectorId);
  const nodeIds = useMemo(() => connectionReference?.nodes || disconnectedNodeIds, [connectionReference?.nodes, disconnectedNodeIds]);

  const disconnected = useMemo(() => disconnectedNodeIds.length > 0, [disconnectedNodeIds.length]);

  const intl = useIntl();
  const openConnectionTooltipText = intl.formatMessage({
    defaultMessage: 'Open connection',
    description: 'Tooltip for the button to open a connection',
  });
  const connectedActionsText = intl.formatMessage({
    defaultMessage: 'Actions',
    description: 'Header for the connected actions section',
  });
  const reassignButtonText = intl.formatMessage({
    defaultMessage: 'Reassign',
    description: 'Button text to reassign actions',
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
  const disconnectedText = intl.formatMessage({
    defaultMessage: 'Disconnected',
    description: 'Text to show when a connection is disconnected',
  });

  const onReassignButtonClick = useCallback(() => {
    dispatch(openPanel({ nodeIds, panelMode: 'Connection', referencePanelMode: 'Connection' }));
  }, [dispatch, nodeIds]);

  const errors = useMemo(() => {
    if (connection?.isLoading) return [];
    if (!connection?.result) return [connectionInvalidStatusText];
    return getConnectionErrors(connection?.result);
  }, [connection, connectionInvalidStatusText]);

  const statusIconComponent = useMemo(() => {
    if (connection?.isLoading) return <Spinner size="extra-small" />;
    if (disconnected) return <PlugDisconnected24Filled />;
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
  }, [connection?.isLoading, connectionInvalidStatusText, connectionValidStatusText, errors.length, disconnected]);

  // Only show the open connection button if the service method is supplied
  const openConnectionSupported = useMemo(() => HostService().openConnectionResource !== undefined, []);
  const openConnectionCallback = useCallback(() => {
    if (!connection?.result?.id) return;
    HostService().openConnectionResource?.(connection?.result?.id);
  }, [connection?.result?.id]);

  const cardTitle = connection?.result?.properties.displayName ?? refId ?? disconnectedText;

  return (
    <div key={refId} className={css('msla-connector-connections-card-connection', disconnected && 'disconnected')}>
      <div className="msla-flex-header">
        {statusIconComponent}
        <Text size={300} weight="semibold" className="msla-flex-header-title">
          {cardTitle}
        </Text>
        <Text size={300} className="msla-flex-header-subtitle">
          {connection?.result?.name}
        </Text>
        {openConnectionSupported && (
          <Tooltip content={openConnectionTooltipText} relationship="label">
            <Button
              icon={<Open24Filled />}
              appearance="subtle"
              style={{ margin: '-6px', marginLeft: 'auto' }}
              onClick={openConnectionCallback}
            />
          </Tooltip>
        )}
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <div className="msla-flex-header">
          <Text>{connectedActionsText}</Text>
          <Tooltip content={reassignConnectionTooltipText} relationship="label">
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowSwap24Filled />}
              onClick={onReassignButtonClick}
              style={{ color: 'var(--colorBrandForeground1)' }}
            >
              {reassignButtonText}
            </Button>
          </Tooltip>
        </div>
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkButton key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
        </div>
      </div>
    </div>
  );
};
