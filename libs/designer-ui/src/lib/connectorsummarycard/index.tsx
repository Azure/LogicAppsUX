import { isBuiltInConnector } from '../connectors/predicates';
import { InfoDot } from '../infoDot';
import { css } from '@fluentui/react';
import { mergeClasses, Text } from '@fluentui/react-components';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { getDescriptionFromConnector, getDisplayNameFromConnector, getIconUriFromConnector } from '@microsoft/logic-apps-shared';
import { OperationRuntimeBadges } from './operationRuntimeBadges';
import { useCallback } from 'react';
import { ChevronRight12Regular } from '@fluentui/react-icons';
import { FavoriteButton } from '../panel';

export interface ConnectorSummaryCardProps {
  connector: Connector | OperationApi;
  displayRuntimeInfo: boolean;
  onClick?: (id: string) => void;
  isCard?: boolean;
}

export const ConnectorSummaryCard = (props: ConnectorSummaryCardProps) => {
  const { connector, onClick, isCard = true, displayRuntimeInfo } = props;
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
          style={isCard ? undefined : { marginRight: '8px' }}
          innerAriaHidden="true"
          className={mergeClasses('msla-recommendation-panel-card-visible-on-hover', 'info-dot-visible-on-hover')}
        />
        <FavoriteButton
          connectorId={connector.id}
          operationId={undefined}
          showFilledFavoriteOnlyOnHover={false}
          showUnfilledFavoriteOnlyOnHover={true}
        />
        <ChevronRight12Regular />
      </div>
      {displayRuntimeInfo ? (
        <div className="msla-connector-summary-labels">
          <OperationRuntimeBadges isBuiltIn={isBuiltIn} />
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
