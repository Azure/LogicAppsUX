import { useConnectionById } from '../../../../core/queries/connections';
import { NodeLinkButton } from './nodeLinkButton';
import { Icon, Text, css } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { Open24Filled, ArrowSwap24Filled } from '@fluentui/react-icons';
import { getConnectionErrors } from '@microsoft/utils-logic-apps';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface ConnectionEntryProps {
  connectorId: string;
  refId: string;
  connectionReference: any;
  brandColor?: string;
  iconUri?: string;
}

export const ConnectionEntry = ({ connectorId, refId, connectionReference, iconUri }: ConnectionEntryProps) => {
  const connection = useConnectionById(connectionReference.connection.id, connectorId);
  const nodeIds = connectionReference.nodes || [];

  const errors = useMemo(() => {
    if (!connection?.result) return [];
    return getConnectionErrors(connection?.result);
  }, [connection]);

  const statusIconComponent = useMemo(() => {
    const hasErrors = errors.length > 0;
    return (
      <Icon
        className={css(
          'msla-connector-connections-card-connection-status-icon',
          hasErrors ? 'msla-connection-status-icon--error' : 'msla-connection-status-icon--success'
        )}
        iconName={hasErrors ? 'ErrorBadge' : 'CompletedSolid'}
      />
    );
  }, [errors]);

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

  return (
    <div key={refId} className="msla-connector-connections-card-connection">
      <div className="msla-flex-header">
        {statusIconComponent}
        <Text className="msla-flex-header-title" variant="large">
          {connection?.result?.properties.displayName ?? refId}
        </Text>
        <Text className="msla-flex-header-subtitle" variant="large">
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
            <Button icon={<ArrowSwap24Filled />} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
