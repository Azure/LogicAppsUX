import NoResultsSvg from '../../../assets/search/noResults.svg';
import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { List } from '@fluentui/react';
import { Spinner, Text } from '@fluentui/react-components';
import type { Connector } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import type { OperationActionData, OperationGroupCardData } from './interfaces';
import { getListHeight, getShouldUseSingleColumn } from './helpers';
import type { OperationGroupData, OperationsData } from './recommendationPanelCard';
import { RecommendationPanelCard } from './recommendationPanelCard';

export type BrowseGridProps = {
  onConnectorSelected?: (connectorId: string) => void;
  onOperationSelected?: (operationId: string, apiId?: string) => void;
  operationsData: Connector[] | Array<OperationActionData | OperationGroupCardData>;
  isLoading: boolean;
  displayRuntimeInfo: boolean;
  showConnectorName?: boolean;
  hideNoResultsText?: boolean;
  isConnector?: boolean;
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
}: BrowseGridProps) => {
  const intl = useIntl();
  const ref = useRef<HTMLDivElement>(null);
  const [forceSingleCol, setForceSingleCol] = useState(false);

  const checkCol = useCallback(() => {
    setForceSingleCol(getShouldUseSingleColumn(ref.current?.clientWidth));
  }, []);

  useEffect(() => {
    checkCol();
    window.addEventListener('resize', checkCol);

    return () => {
      window.removeEventListener('resize', checkCol);
    };
  }, [checkCol]);

  const onRenderCell = useCallback(
    (operationData?: Connector | OperationActionData | OperationGroupCardData) => {
      if (!operationData) {
        return;
      }

      if (isConnector) {
        const connector = operationData as Connector;
        return (
          <div className="msla-browse-list-tile-wrapper">
            <div className="msla-browse-list-tile" style={{ width: forceSingleCol ? '100%' : '50%' }}>
              <ConnectorSummaryCard
                key={connector.id}
                connector={connector}
                onClick={onConnectorSelected}
                displayRuntimeInfo={displayRuntimeInfo}
              />
            </div>
          </div>
        );
      }

      const typedData: OperationGroupData | OperationsData =
        'id' in operationData
          ? { type: 'Operation', data: operationData as OperationActionData }
          : { type: 'OperationGroup', data: operationData as OperationGroupCardData };

      return (
        <div className="msla-browse-list-tile-wrapper">
          <div className="msla-browse-list-tile" style={{ width: forceSingleCol ? '100%' : '50%' }}>
            <RecommendationPanelCard
              operationData={typedData}
              onConnectorClick={onConnectorSelected}
              onOperationClick={onOperationSelected}
              showUnfilledFavoriteOnlyOnHover={true}
              showConnectorName={showConnectorName}
            />
          </div>
        </div>
      );
    },
    [displayRuntimeInfo, forceSingleCol, isConnector, onConnectorSelected, onOperationSelected, showConnectorName]
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
        <img src={NoResultsSvg} alt={noResultsText?.toString()} />
        <Text>{noResultsText}</Text>
      </div>
    );
  }

  return (
    <div ref={ref} className="msla-browse-list">
      {isLoading && (
        <div style={{ marginBottom: '16px' }}>
          <Spinner size="extra-small" label={loadingText} aria-live="assertive" />
        </div>
      )}

      <List onRenderCell={onRenderCell} items={operationsData} getPageHeight={() => getListHeight(forceSingleCol)} />
    </div>
  );
};
