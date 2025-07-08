import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { List } from '@fluentui/react';
import { Spinner, Text } from '@fluentui/react-components';

import NoResultsSvg from '../../../assets/search/noResults.svg';
import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { RecommendationPanelCard } from './recommendationPanelCard';
import { getListHeight, getShouldUseSingleColumn } from './helpers';

import type { Connector } from '@microsoft/logic-apps-shared';
import type { OperationActionData, OperationGroupCardData } from './interfaces';
import type { OperationGroupData, OperationsData } from './recommendationPanelCard';

export type BrowseGridProps = {
  onConnectorSelected?: (connectorId: string) => void;
  onOperationSelected?: (operationId: string, apiId?: string) => void;
  operationsData: Connector[] | Array<OperationActionData | OperationGroupCardData>;
  isLoading: boolean;
  displayRuntimeInfo: boolean;
  showConnectorName?: boolean;
  hideNoResultsText?: boolean;
  isConnector?: boolean;
  hideFavorites?: boolean;
};

export const BrowseGrid = ({
  operationsData,
  onConnectorSelected,
  onOperationSelected,
  isLoading,
  displayRuntimeInfo,
  showConnectorName,
  hideNoResultsText,
  isConnector,
  hideFavorites,
}: BrowseGridProps) => {
  const intl = useIntl();
  const [forceSingleCol, setForceSingleCol] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateLayout = () => {
      setForceSingleCol(getShouldUseSingleColumn(element.clientWidth));
    };

    updateLayout(); // Initial layout

    const observer = new ResizeObserver(() => {
      updateLayout();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const onRenderCell = useCallback(
    (item?: Connector | OperationActionData | OperationGroupCardData) => {
      if (!item) {
        return null;
      }

      const style = { width: forceSingleCol ? '100%' : '50%' };
      const className = 'msla-browse-list-tile';

      if (isConnector) {
        return (
          <div className="msla-browse-list-tile-wrapper">
            <div className={className} style={style}>
              <ConnectorSummaryCard
                key={(item as Connector).id}
                connector={item as Connector}
                onClick={onConnectorSelected}
                displayRuntimeInfo={displayRuntimeInfo}
                hideFavorites={hideFavorites}
              />
            </div>
          </div>
        );
      }

      const typedData: OperationGroupData | OperationsData =
        'id' in item
          ? { type: 'Operation', data: item as OperationActionData }
          : { type: 'OperationGroup', data: item as OperationGroupCardData };

      return (
        <div className="msla-browse-list-tile-wrapper">
          <div className={className} style={style}>
            <RecommendationPanelCard
              operationData={typedData}
              onConnectorClick={onConnectorSelected}
              onOperationClick={onOperationSelected}
              showUnfilledFavoriteOnlyOnHover
              showConnectorName={showConnectorName}
              hideFavorites={hideFavorites}
            />
          </div>
        </div>
      );
    },
    [displayRuntimeInfo, forceSingleCol, hideFavorites, isConnector, onConnectorSelected, onOperationSelected, showConnectorName]
  );

  const noResultsText = intl.formatMessage({
    defaultMessage: 'No results found for the specified filters',
    id: 'w0pI5M',
    description: 'Text to show when there are no browse results with the given filters',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading all connectors...',
    id: 'OOUTdW',
    description: 'Message to show under the loading icon when loading connectors',
  });

  if (!isLoading && operationsData.length === 0 && !hideNoResultsText) {
    return (
      <div className="msla-no-results-container">
        <img src={NoResultsSvg} alt={noResultsText} />
        <Text>{noResultsText}</Text>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="msla-browse-list">
      {isLoading && (
        <div style={{ marginBottom: 16 }}>
          <Spinner size="extra-small" label={loadingText} aria-live="assertive" />
        </div>
      )}
      <List items={operationsData as any} onRenderCell={onRenderCell} getPageHeight={() => getListHeight(forceSingleCol)} />
    </div>
  );
};
