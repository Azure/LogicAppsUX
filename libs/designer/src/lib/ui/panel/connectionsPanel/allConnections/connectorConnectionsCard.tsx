import { useAllConnectionErrors } from '../../../../core';
import { ConnectionEntry } from './connectionEntry';
import { Text, AccordionHeader, AccordionPanel, Spinner, Badge } from '@fluentui/react-components';
import { getConnectorCategoryString } from '@microsoft/designer-ui';
import { fallbackConnectorIconUrl, isBuiltInConnector } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

export interface ConnectorConnectionsCardProps {
  connectorId: string;
  title: string;
  brandColor?: string;
  iconUri?: string;
  connectionRefs?: Record<string, any>;
  disconnectedNodes?: string[];
  isLoading?: boolean;
}

export const ConnectorConnectionsCard: React.FC<ConnectorConnectionsCardProps> = ({
  connectorId,
  title,
  brandColor,
  iconUri,
  connectionRefs = {},
  disconnectedNodes = [],
  isLoading = false,
}) => {
  const isBuiltIn = isBuiltInConnector(connectorId);
  const category = getConnectorCategoryString(connectorId);

  const allErrors = useAllConnectionErrors();
  const hasErrors = useMemo(() => {
    if (disconnectedNodes?.length > 0) return true;
    const nodesWithErrors = Object.keys(allErrors);
    const connectorNodeIds = Object.values(connectionRefs)
      .map((obj) => obj.nodes)
      .flat();
    return nodesWithErrors.some((nodeId) => connectorNodeIds.includes(nodeId));
  }, [allErrors, connectionRefs, disconnectedNodes?.length]);

  return (
    <div key={connectorId} className="msla-connector-connections-card">
      <AccordionHeader>
        <div className="msla-flex-header">
          {isLoading ? (
            <div className="msla-action-icon large">
              <Spinner size="extra-small" style={{ margin: '4px' }} />
            </div>
          ) : (
            <>
              <img className="msla-action-icon large" src={fallbackConnectorIconUrl(iconUri)} alt="" />
              <Text size={300} weight="semibold" className="msla-flex-header-title">
                {title}
              </Text>
              {isBuiltIn && (
                <Badge shape="rounded" appearance="outline">
                  {category}
                </Badge>
              )}
              {hasErrors && <Badge size="extra-small" color="danger" />}
            </>
          )}
        </div>
      </AccordionHeader>
      <AccordionPanel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(connectionRefs).map(([refId, connectionReference]) => (
            <ConnectionEntry
              key={refId}
              connectorId={connectorId}
              refId={refId}
              connectionReference={connectionReference}
              iconUri={iconUri}
              brandColor={brandColor}
            />
          ))}
          {disconnectedNodes?.length > 0 && (
            <ConnectionEntry disconnectedNodeIds={disconnectedNodes} connectorId={connectorId} iconUri={iconUri} brandColor={brandColor} />
          )}
        </div>
      </AccordionPanel>
    </div>
  );
};
