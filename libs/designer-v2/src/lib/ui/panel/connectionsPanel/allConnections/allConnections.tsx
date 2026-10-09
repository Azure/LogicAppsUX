import { useConnectionMapping, useConnectionRefs, type RootState } from '../../../../core';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { ConnectorConnectionsCard } from './connectorConnectionsCard';
import type { ConnectionReferenceWithNodes } from './connectionEntry';
import { Accordion, type AccordionToggleEventHandler } from '@fluentui/react-components';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectionPanelExpandedConnectorIds } from '../../../../core/state/panel/panelSlice';
import { AllConnectionsEmptyState } from './allConnectionsEmptyState';
import { isExpressionConnectionMapping } from '../../../../common/models/workflow';

interface ConnectorConnectionGroup {
  connectionRefs: Record<string, ConnectionReferenceWithNodes>;
  disconnectedNodes: string[];
  runtimeNodes: string[];
}

export const AllConnections = () => {
  const dispatch = useDispatch();
  const connectionMapping = useConnectionMapping();
  const connectionReferences = useConnectionRefs();
  const allOperationInfo = useSelector((state: RootState) => state.operations.operationInfo);

  const groupedConnections = useMemo(() => {
    const grouped: Record<string, ConnectorConnectionGroup> = {};
    for (const [nodeId, mapping] of Object.entries(connectionMapping)) {
      const reference = typeof mapping === 'string' && mapping ? connectionReferences[mapping] : undefined;
      const apiId = typeof mapping === 'string' && mapping ? reference?.api.id : getRecordEntry(allOperationInfo, nodeId)?.connectorId;
      if (!apiId) {
        continue;
      }
      // Connector IDs are case-insensitive; connection reference keys are not.
      const connectorId = apiId.toLowerCase();
      const group = (grouped[connectorId] ??= { connectionRefs: {}, disconnectedNodes: [], runtimeNodes: [] });
      if (isExpressionConnectionMapping(mapping)) {
        group.runtimeNodes.push(nodeId);
      } else if (reference && typeof mapping === 'string') {
        const connection = (group.connectionRefs[mapping] ??= { ...reference, nodes: [] });
        connection.nodes.push(nodeId);
      } else {
        group.disconnectedNodes.push(nodeId);
      }
    }
    return grouped;
  }, [allOperationInfo, connectionMapping, connectionReferences]);

  const openConnectors = (useSelector((state: RootState) => state.panel.connectionContent.expandedConnectorIds) || []).map((id) =>
    id.toLowerCase()
  );
  const handleToggle: AccordionToggleEventHandler = (_e, data) => {
    dispatch(setConnectionPanelExpandedConnectorIds(data.openItems.filter((id): id is string => typeof id === 'string')));
  };

  const hasConnections = Object.keys(groupedConnections).length > 0;

  if (!hasConnections) {
    return <AllConnectionsEmptyState />;
  }

  return (
    <Accordion collapsible multiple openItems={openConnectors} onToggle={handleToggle}>
      {Object.entries(groupedConnections).map(([apiId, group]) => (
        <ConnectorCardWrapper key={apiId} apiId={apiId} {...group} />
      ))}
    </Accordion>
  );
};

interface ConnectorCardWrapperProps extends ConnectorConnectionGroup {
  apiId: string;
}

const ConnectorCardWrapper = ({ apiId, connectionRefs, disconnectedNodes, runtimeNodes }: ConnectorCardWrapperProps) => {
  const { data: connector, isFetching } = useConnector(apiId);

  return (
    <div>
      <ConnectorConnectionsCard
        isLoading={isFetching}
        connectorId={apiId}
        connector={connector}
        connectionRefs={connectionRefs}
        disconnectedNodes={disconnectedNodes}
        runtimeNodes={runtimeNodes}
      />
    </div>
  );
};
