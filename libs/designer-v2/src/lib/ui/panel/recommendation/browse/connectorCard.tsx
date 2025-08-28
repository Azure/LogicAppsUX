import { useCallback } from 'react';
import { Text } from '@fluentui/react-components';
import { ChevronRight12Regular } from '@fluentui/react-icons';
import type { Connector } from '@microsoft/logic-apps-shared';
import { getDisplayNameFromConnector, getDescriptionFromConnector, getIconUriFromConnector } from '@microsoft/logic-apps-shared';
import { isBuiltInConnector } from '@microsoft/designer-ui';
import { useConnectorCardStyles } from './styles/ConnectorCard.styles';

export interface ConnectorCardProps {
  connector: Connector;
  onClick?: (connectorId: string) => void;
  displayRuntimeInfo?: boolean;
}

export const ConnectorCard = ({ connector, onClick, displayRuntimeInfo }: ConnectorCardProps) => {
  const classes = useConnectorCardStyles();
  const connectorName = getDisplayNameFromConnector(connector);
  const description = getDescriptionFromConnector(connector);
  const iconUrl = getIconUriFromConnector(connector);
  const isBuiltIn = isBuiltInConnector(connector);

  const handleClick = useCallback(() => {
    onClick?.(connector.id);
  }, [connector.id, onClick]);

  return (
    <div className={classes.card} onClick={handleClick}>
      {/* Icon */}
      <div className={classes.iconContainer}>
        <img src={iconUrl} alt={connectorName} className={classes.icon} />
      </div>

      {/* Connector Info */}
      <div className={classes.content}>
        <div className={classes.titleRow}>
          <Text className={classes.title}>{connectorName}</Text>
          {displayRuntimeInfo && isBuiltIn && <div className={classes.builtInBadge}>Built-in</div>}
        </div>
        {description && <Text className={classes.description}>{description}</Text>}
      </div>

      {/* Chevron */}
      <div className={classes.chevron}>
        <ChevronRight12Regular />
      </div>
    </div>
  );
};
