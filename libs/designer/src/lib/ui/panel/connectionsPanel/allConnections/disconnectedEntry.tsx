import { NodeLinkButton } from './nodeLinkButton';
import { Text } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowSwap24Filled, PlugDisconnected24Filled } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

interface DisconnectedEntryProps {
  connectorId: string;
  brandColor?: string;
  iconUri?: string;
  nodeIds: string[];
}

export const DisconnectedEntry = ({ iconUri, nodeIds }: DisconnectedEntryProps) => {
  const intl = useIntl();
  const componentTitle = intl.formatMessage({
    defaultMessage: 'Disconnected actions',
    description: 'Header for the disconnected actions section',
  });
  const assignConnectionToAllTooltipText = intl.formatMessage({
    defaultMessage: 'Reassign all disconnected actions to a new connection',
    description: 'Tooltip for the button to reassign actions',
  });

  return (
    <div className="msla-connector-connections-card-connection disconnected">
      <div className="msla-flex-header">
        <PlugDisconnected24Filled />
        <Text className="msla-flex-header-title" variant="large">
          {componentTitle}
        </Text>
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkButton key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
          <Tooltip content={assignConnectionToAllTooltipText} relationship="label">
            <Button icon={<ArrowSwap24Filled />} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
