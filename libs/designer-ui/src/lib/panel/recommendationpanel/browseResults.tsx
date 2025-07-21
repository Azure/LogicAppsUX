import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Spinner, Text } from '@fluentui/react-components';

import NoResultsSvg from '../../../assets/search/noResults.svg';
import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { RecommendationPanelCard } from './recommendationPanelCard';
import { getShouldUseSingleColumn } from './helpers';

import type { Connector } from '@microsoft/logic-apps-shared';
import type { OperationActionData, OperationGroupCardData } from './interfaces';
import { useBrowseResultStyles } from './browseResults.styles';

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
  const classes = useBrowseResultStyles();
  const [forceSingleCol, setForceSingleCol] = useState(false);
  const [displayedItemCount, setDisplayedItemCount] = useState(() => {
    // Start with a larger initial batch size for better performance
    const initialBatchSize = 50;
    return Math.min(initialBatchSize, operationsData.length);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const updateLayout = () => {
      const width = element.clientWidth;
      const shouldUseSingle = getShouldUseSingleColumn(width);
      setForceSingleCol(shouldUseSingle);
    };
    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Progressive loading - show more items as user scrolls
  const displayedData = useMemo(() => {
    return operationsData.slice(0, displayedItemCount);
  }, [operationsData, displayedItemCount]);

  const hasMoreToShow = displayedItemCount < operationsData.length;
  const batchSize = 50; // Load 50 items at a time for better performance
  const loadingRef = useRef(false); // Prevent multiple simultaneous loads

  const loadMoreItems = useCallback(() => {
    if (hasMoreToShow && !isLoading && !loadingRef.current) {
      loadingRef.current = true;

      // Use requestAnimationFrame to batch the update
      requestAnimationFrame(() => {
        setDisplayedItemCount((prev) => {
          const newCount = Math.min(prev + batchSize, operationsData.length);
          setTimeout(() => {
            loadingRef.current = false;
          }, 100); // Small delay to prevent rapid firing
          return newCount;
        });
      });
    }
  }, [hasMoreToShow, isLoading, batchSize, operationsData.length]);

  // Intersection Observer for progressive loading with throttling
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMoreToShow) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadMoreItems();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreToShow, loadMoreItems]);

  useEffect(() => {
    const initialBatchSize = 50;
    setDisplayedItemCount(Math.min(initialBatchSize, operationsData.length));
    loadingRef.current = false;
  }, [operationsData]);

  const renderCard = useCallback(
    (item: Connector | OperationActionData | OperationGroupCardData, index: number) => {
      const itemKey = isConnector
        ? (item as Connector).id
        : 'id' in item
          ? (item as OperationActionData).id
          : `group-${(item as OperationGroupCardData).connectorName}-${index}`;

      return (
        <div key={itemKey} className={classes.itemWrapper}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            {isConnector ? (
              <ConnectorSummaryCard
                connector={item as Connector}
                onClick={onConnectorSelected}
                displayRuntimeInfo={displayRuntimeInfo}
                hideFavorites={hideFavorites}
              />
            ) : (
              <RecommendationPanelCard
                operationData={
                  'id' in item
                    ? { type: 'Operation', data: item as OperationActionData }
                    : {
                        type: 'OperationGroup',
                        data: item as OperationGroupCardData,
                      }
                }
                onConnectorClick={onConnectorSelected}
                onOperationClick={onOperationSelected}
                showUnfilledFavoriteOnlyOnHover
                showConnectorName={showConnectorName}
                hideFavorites={hideFavorites}
              />
            )}
          </div>
        </div>
      );
    },
    [isConnector, onConnectorSelected, onOperationSelected, displayRuntimeInfo, showConnectorName, hideFavorites, classes.itemWrapper]
  );

  const noResultsText = intl.formatMessage({
    defaultMessage: 'No results found for the specified filters',
    id: '1GWzEL',
    description: 'Text displayed when no results are found in the browse grid',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading all connectors...',
    id: 'RkQuAC',
    description: 'Text displayed while connectors are being loaded in the browse grid',
  });

  const showingConnectorLabel = intl.formatMessage(
    {
      defaultMessage: 'Showing {count} of {total}',
      id: 'vyddjn',
      description: 'Label indicating how many items are currently displayed in the browse grid',
    },
    { count: displayedItemCount, total: operationsData.length }
  );

  if (!isLoading && operationsData.length === 0 && !hideNoResultsText) {
    return (
      <div className={classes.noResults}>
        <img src={NoResultsSvg} alt={noResultsText} />
        <Text>{noResultsText}</Text>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={classes.container}>
      {isLoading && operationsData.length === 0 && (
        <div className={classes.loadingContainer}>
          <Spinner size="extra-small" label={loadingText} aria-live="assertive" />
        </div>
      )}
      <div className={`${classes.gridContainer} ${forceSingleCol ? '' : classes.doubleColumn}`}>
        {displayedData.map((item, index) => renderCard(item, index))}

        {/* Sentinel element for intersection observer */}
        {hasMoreToShow && (
          <div ref={sentinelRef} className={classes.loadingMoreContainer}>
            <Spinner size="extra-small" label={showingConnectorLabel} />
          </div>
        )}
      </div>
    </div>
  );
};
