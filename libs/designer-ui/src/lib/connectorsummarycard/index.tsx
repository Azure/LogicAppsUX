import { isBuiltInConnector, isPremiumConnector } from '../connectors/predicates';
import { InfoDot } from '../infoDot';
import { css } from '@fluentui/react';
import { Badge, Text } from '@fluentui/react-components';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { getDescriptionFromConnector, getDisplayNameFromConnector, getIconUriFromConnector } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';

export interface ConnectorSummaryCardProps {
  connector: Connector | OperationApi;
  displayRuntimeInfo: boolean;
  category: string;
  onClick?: (id: string) => void;
  isCard?: boolean;
}

const pseudoBadgeStyles = {
  fontSize: '11px',
  lineHeight: '16px',
  fontWeight: 600,
};

export const ConnectorSummaryCard = (props: ConnectorSummaryCardProps) => {
  const { connector, category, onClick, isCard = true, displayRuntimeInfo } = props;
  const { id } = connector;

  const connectorName = getDisplayNameFromConnector(connector);
  const description = getDescriptionFromConnector(connector);
  const iconUrl = getIconUriFromConnector(connector);

  const handleClick = () => onClick?.(id);

  const ConnectorImage = useCallback(() => {
    return <img className={css('msla-connector-summary-image', !isCard && 'large')} alt={connectorName} src={iconUrl} />;
  }, [connectorName, iconUrl, isCard]);

  const isBuiltIn = isBuiltInConnector(connector);
  const isPremium = isPremiumConnector(connector);

  const Content = () => (
    <>
      <div className="msla-connector-summary-header">
        {isCard ? <ConnectorImage /> : null}
        <Text className="msla-connector-summary-title">{connectorName}</Text>
        <InfoDot
          title={connectorName}
          description={description}
          style={isCard ? undefined : { marginRight: '8px' }}
          innerAriaHidden="true"
        />
      </div>
      {displayRuntimeInfo ? (
        <div className="msla-connector-summary-labels">
          {isBuiltIn ? (
            <Badge style={pseudoBadgeStyles} appearance="outline">
              {category}
            </Badge>
          ) : isPremium ? (
            <Badge style={pseudoBadgeStyles} appearance="outline" shape="square" color="success">
              {category}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (isCard) {
    return (
      <button className="msla-connector-summary-card" onClick={handleClick} aria-label={connectorName} data-automation-id={id}>
        <Content />
      </button>
    );
  }

  return (
    <div className="msla-connector-summary-display" data-automation-id={id}>
      <ConnectorImage />
      <div style={{ flexGrow: 1 }}>
        <Content />
      </div>
    </div>
  );
};
