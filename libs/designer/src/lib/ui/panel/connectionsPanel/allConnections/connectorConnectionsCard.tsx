import { useAllConnectionErrors } from '../../../../core';
import { ConnectionEntry } from './connectionEntry';
import { AccordionHeader, AccordionPanel, Badge, Spinner, Text } from '@fluentui/react-components';
import {
  getBrandColorFromConnector,
  getConnectorCategoryString,
  getDisplayNameFromConnector,
  getIconUriFromConnector,
  isBuiltInConnector,
} from '@microsoft/designer-ui';
import type { Connector } from '@microsoft/logic-apps-shared';
import { fallbackConnectorIconUrl } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

export interface ConnectorConnectionsCardProps {
  connectorId: string;
  connector: Connector | undefined;
  connectionRefs?: Record<string, any>;
  disconnectedNodes?: string[];
  isLoading?: boolean;
}

export const ConnectorConnectionsCard: React.FC<ConnectorConnectionsCardProps> = ({
  connectorId,
  connector,
  connectionRefs = {},
  disconnectedNodes = [],
  isLoading = false,
}) => {
  const title = getDisplayNameFromConnector(connector) ?? connectorId;
  const iconUri = getIconUriFromConnector(connector);
  const brandColor = getBrandColorFromConnector(connector);

  const isBuiltIn = isBuiltInConnector(connector ?? connectorId);
  const category = getConnectorCategoryString(connector ?? connectorId);

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
