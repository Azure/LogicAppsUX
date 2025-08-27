import { useMemo } from 'react';
import { Link } from '@fluentui/react-components';
import { useFavoriteOperations } from '../../../../core/queries/browse';
import { useDiscoveryPanelFavoriteOperations } from '../../../../core/state/panel/panelSelectors';
import { getOperationCardDataFromOperation, getOperationGroupCardDataFromConnector } from '../helpers';
import { useFavoritesStyles } from './styles/Favorites.styles';
import { useIntl } from 'react-intl';
import { useIsAgenticWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { Grid } from '@microsoft/designer-ui';

export interface FavoritesProps {
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string) => void;
}

export const Favorites = ({ onConnectorSelected, onOperationSelected }: FavoritesProps) => {
  const intl = useIntl();
  const classes = useFavoritesStyles();
  const isAgenticWorkflow = useIsAgenticWorkflow();

  const favoriteOperationIds = useDiscoveryPanelFavoriteOperations();
  const {
    favoriteConnectorsData,
    isLoadingFavoriteConnectors,
    favoriteActionsData,
    favoriteActionsFetchNextPage,
    favoriteActionsHasNextPage,
    favoriteActionsIsFetching,
    favoriteActionsIsFetchingNextPage,
  } = useFavoriteOperations(favoriteOperationIds);

  const favoriteOperations = useMemo(() => {
    const favorites = [
      ...favoriteConnectorsData.map(getOperationGroupCardDataFromConnector),
      ...favoriteActionsData.map(getOperationCardDataFromOperation),
    ];
    return isAgenticWorkflow ? favorites : favorites.filter((f) => f.apiId !== 'connectionProviders/agent');
  }, [favoriteConnectorsData, favoriteActionsData, isAgenticWorkflow]);

  const loadingMoreText = intl.formatMessage({
    defaultMessage: 'Loading more...',
    id: 'QecW1y',
    description: 'Loading more text',
  });

  const loadMoreText = intl.formatMessage({
    defaultMessage: 'Load more',
    id: 'fGKmXs',
    description: 'Load more text',
  });

  const noOperationDescription = intl.formatMessage({
    defaultMessage: 'No Favorite actions or connectors found. Use the Star icon next to existing actions to add them to your favorites.',
    id: 'rPw0Hp',
    description: 'No actions available text',
  });

  return (
    <div className={classes.container}>
      <Grid
        items={favoriteOperations}
        isLoading={isLoadingFavoriteConnectors || favoriteActionsIsFetching}
        onConnectorSelected={onConnectorSelected}
        onOperationSelected={onOperationSelected}
        emptyStateText={noOperationDescription}
        displayRuntimeInfo={false}
        isConnector={false}
        loadingText="Loading favorites..."
      />

      {favoriteActionsHasNextPage || favoriteActionsIsFetchingNextPage ? (
        <Link className={classes.favoriteLoadMoreLink} onClick={() => favoriteActionsFetchNextPage()}>
          {favoriteActionsIsFetchingNextPage ? loadingMoreText : loadMoreText}
        </Link>
      ) : null}
    </div>
  );
};
