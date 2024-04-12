import { isBuiltInConnector } from '../connectors/predicates';
import { InfoDot } from '../infoDot';
import { Text, css } from '@fluentui/react';
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

  const Content = () => (
    <>
      <div className="msla-connector-summary-header">
        {isCard ? <ConnectorImage /> : null}
        <Text className="msla-connector-summary-title">{connectorName}</Text>
        <InfoDot
          title={connectorName}
          description={description}
          style={!isCard ? { marginRight: '8px' } : undefined}
          innerAriaHidden="true"
        />
      </div>
      {displayRuntimeInfo ? (
        <div className="msla-connector-summary-labels">{isBuiltIn ? <Text className="msla-psuedo-badge">{category}</Text> : null}</div>
      ) : null}
    </>
  );

  if (isCard)
    return (
      <button
        className="msla-connector-summary-card"
        onClick={handleClick}
        aria-label={`${connectorName} ${description}`}
        data-automation-id={id}
      >
        <Content />
      </button>
    );

  return (
    <div className="msla-connector-summary-display" data-automation-id={id}>
      <ConnectorImage />
      <div style={{ flexGrow: 1 }}>
        <Content />
      </div>
    </div>
  );
};
