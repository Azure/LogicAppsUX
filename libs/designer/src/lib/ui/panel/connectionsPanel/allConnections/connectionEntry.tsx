import { setSelectedNodeId, changePanelNode, setFocusNode } from '../../../../core';
import { useConnectionById } from '../../../../core/queries/connections';
import { showDefaultTabs } from '../../../../core/state/panel/panelSlice';
import { useNodeDisplayName } from '../../../../core/state/workflow/workflowSelectors';
import { Icon, Text, css } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { getConnectionErrors } from '@microsoft/utils-logic-apps';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

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

  return (
    <div key={refId} className="msla-connector-connections-card-connection">
      <div className="msla-connector-connections-card-header">
        {statusIconComponent}
        <Text className="msla-connector-connections-card-connection-title" variant="large">
          {connection?.result?.properties.displayName ?? refId}
        </Text>
        <Text className="msla-connector-connections-card-connection-subtitle" variant="large">
          {connection?.result?.name}
        </Text>
      </div>
      <div className="msla-connector-connections-card-connection-body">
        <Text>{'Connected Nodes:'}</Text>
        <div className="msla-connector-connections-card-connection-nodes">
          {nodeIds.map((nodeId: string) => (
            <NodeLinkBadge key={nodeId} nodeId={nodeId} iconUri={iconUri} />
          ))}
        </div>
      </div>
    </div>
  );
};

const NodeLinkBadge = ({ nodeId, iconUri }: { nodeId: string; iconUri?: string }) => {
  const dispatch = useDispatch();
  const id = useNodeDisplayName(nodeId);

  const nodeClick = useCallback(() => {
    dispatch(setFocusNode(nodeId));
    dispatch(setSelectedNodeId(nodeId));
    dispatch(changePanelNode(nodeId));
    dispatch(showDefaultTabs());
  }, [dispatch, nodeId]);

  return (
    <Button size="small" icon={<img src={iconUri} alt="" style={{ width: 'inherit', borderRadius: '2px' }} />} onClick={nodeClick}>
      {id}
    </Button>
  );
};
