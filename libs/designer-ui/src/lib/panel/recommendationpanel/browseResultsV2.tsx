import { useMemo, memo } from 'react';
import { useIntl } from 'react-intl';
import { Spinner, Text } from '@fluentui/react-components';

import { useGridStyles } from './Grid.styles';

import type { Connector } from '@microsoft/logic-apps-shared';
import type { OperationActionData, OperationGroupCardData } from './interfaces';
import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { RecommendationPanelCard } from './recommendationPanelCard';

export interface GridProps {
  // Data
  items: Array<Connector | OperationActionData | OperationGroupCardData>;

  // Callbacks
  onConnectorSelected?: (connectorId: string) => void;
  onOperationSelected?: (operationId: string, apiId?: string) => void;

  // Loading & States
  isLoading?: boolean;
  loadingText?: string;
  emptyStateText?: string;
  showEmptyState?: boolean;

  // Display Options
  displayRuntimeInfo?: boolean;
  showConnectorName?: boolean;
  hideFavorites?: boolean;
  isConnector?: boolean;
}

export const Grid = ({
  items = [],
  onConnectorSelected,
  onOperationSelected,
  isLoading = false,
  loadingText,
  emptyStateText,
  showEmptyState = true,
  displayRuntimeInfo = false,
  showConnectorName,
  hideFavorites,
  isConnector = false,
}: GridProps) => {
  const intl = useIntl();
  const classes = useGridStyles();

  // Create stable item keys to prevent re-renders
  const getItemKey = (item: Connector | OperationActionData | OperationGroupCardData, index: number) => {
    if (isConnector) {
      return (item as Connector).id;
    }
    if ('id' in item) {
      return (item as OperationActionData).id;
    }
    return `group-${(item as OperationGroupCardData).connectorName}-${index}`;
  };

  // Memoized card component to prevent re-renders
  const CardItem = useMemo(() => {
    const MemoizedCardItem = memo<{
      item: Connector | OperationActionData | OperationGroupCardData;
      itemKey: string;
      isConnector: boolean;
    }>(({ item, isConnector: itemIsConnector }) => {
      return (
        <div className={classes.itemWrapper}>
          <div className={classes.itemContent}>
            {itemIsConnector ? (
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
    });

    MemoizedCardItem.displayName = 'Grid.CardItem';
    return MemoizedCardItem;
  }, [
    classes.itemWrapper,
    classes.itemContent,
    onConnectorSelected,
    onOperationSelected,
    displayRuntimeInfo,
    showConnectorName,
    hideFavorites,
  ]);

  // Default texts
  const defaultLoadingText = intl.formatMessage({
    defaultMessage: 'Loading...',
    id: 'qiw5AG',
    description: 'Default loading text for grid component',
  });

  const defaultEmptyText = intl.formatMessage({
    defaultMessage: 'No items found',
    id: '85n/lh',
    description: 'Default empty state text for grid component',
  });

  const finalLoadingText = loadingText || defaultLoadingText;
  const finalEmptyText = emptyStateText || defaultEmptyText;

  // Show loading state
  if (isLoading && items.length === 0) {
    return (
      <div className={classes.container}>
        <div className={classes.loadingContainer}>
          <Spinner size="medium" label={finalLoadingText} aria-live="assertive" />
        </div>
      </div>
    );
  }

  // Show empty state
  if (!isLoading && items.length === 0 && showEmptyState) {
    return (
      <div className={classes.container}>
        <div className={classes.emptyState}>
          <Text>{finalEmptyText}</Text>
        </div>
      </div>
    );
  }

  // Show list with items
  return (
    <div className={classes.container}>
      <div className={classes.listContainer}>
        {items.map((item, index) => {
          const itemKey = getItemKey(item, index);
          return <CardItem key={itemKey} item={item} itemKey={itemKey} isConnector={isConnector} />;
        })}
      </div>
    </div>
  );
};
