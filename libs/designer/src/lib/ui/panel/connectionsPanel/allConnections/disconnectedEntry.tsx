import { openPanel } from '../../../../core/state/panel/panelSlice';
import { NodeLinkButton } from './nodeLinkButton';
import { Button, Text, Tooltip } from '@fluentui/react-components';
import { ArrowSwap24Filled, PlugDisconnected24Filled } from '@fluentui/react-icons';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface DisconnectedEntryProps {
  connectorId: string;
  brandColor?: string;
  iconUri?: string;
  nodeIds: string[];
}

export const DisconnectedEntry = ({ iconUri, nodeIds }: DisconnectedEntryProps) => {
  const dispatch = useDispatch();

  const intl = useIntl();
  const componentTitle = intl.formatMessage({
    defaultMessage: 'Disconnected actions',
    description: 'Header for the disconnected actions section',
  });
  const assignConnectionToAllTooltipText = intl.formatMessage({
    defaultMessage: 'Reassign all disconnected actions to a new connection',
    description: 'Tooltip for the button to reassign actions',
  });

  const onReassignButtonClick = useCallback(() => {
    dispatch(openPanel({ nodeIds, panelMode: 'Connection', referencePanelMode: 'Connection' }));
  }, [dispatch, nodeIds]);

  return (
    <div className="msla-connector-connections-card-connection disconnected">
      <div className="msla-flex-header">
        <PlugDisconnected24Filled />
        <Text size={300} weight="semibold" className="msla-flex-header-title">
          {componentTitle}
        </Text>
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkButton key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
          <Tooltip content={assignConnectionToAllTooltipText} relationship="label">
            <Button icon={<ArrowSwap24Filled />} onClick={onReassignButtonClick} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
