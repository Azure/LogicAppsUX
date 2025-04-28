import { Link } from '@fluentui/react';
import { Accordion, type AccordionToggleEventHandler, makeStyles, tokens } from '@fluentui/react-components';
import { useAllConnectors, useFavoriteOperations } from '../../../core/queries/browse';
import { useDiscoveryPanelFavoriteOperations } from '../../../core/state/panel/panelSelectors';
import { useEffect, useMemo, useState } from 'react';
import type { Connector } from '@microsoft/logic-apps-shared';
import { getOperationCardDataFromOperation, getOperationGroupCardDataFromConnector } from './helpers';
import { useIntl } from 'react-intl';
import { SpotlightCategoryType, SpotlightSection } from '@microsoft/designer-ui';
import { useAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';

export interface ActionSpotlightProps {
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string) => void;
  filters?: Record<string, string>;
}

const useActionSpotlightStyles = makeStyles({
  accordion: {
    marginBottom: tokens.spacingVerticalL,
  },
  favoriteLoadMoreLink: {
    marginLeft: 'auto',
    display: 'flex',
    marginRight: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase300,
    paddingTop: tokens.spacingVerticalS,
  },
});

export const ActionSpotlight = (props: ActionSpotlightProps) => {
  const intl = useIntl();
  const { filters, onConnectorSelected, onOperationSelected } = props;
  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllConnectors();
  const isAgenticWorkflow = useAgenticWorkflow();

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

  const [openItems, setOpenItems] = useState<SpotlightCategoryType[]>([
    SpotlightCategoryType.BuiltIns,
    SpotlightCategoryType.AICapabilities,
    ...(favoriteOperationIds.length > 0 ? [SpotlightCategoryType.Favorites] : []),
  ]);

  useEffect(() => {
    setOpenItems((prevItems) => [...prevItems, ...(favoriteOperationIds.length > 0 ? [SpotlightCategoryType.Favorites] : [])]);
  }, [favoriteOperationIds.length]);

  const handleToggle: AccordionToggleEventHandler<SpotlightCategoryType> = (_event, data) => {
    setOpenItems(data.openItems);
  };

  const classNames = useActionSpotlightStyles();

  const builtInActions = useMemo(() => {
    const allowedIds = ['connectionProviders/control', 'connectionProviders/dataOperationNew', 'connectionProviders/datetime'];

    const builtIns = allConnectors
      .filter((connector: Connector) => allowedIds.includes(connector.id))
      .map((connector) => getOperationGroupCardDataFromConnector(connector));

    return builtIns;
  }, [allConnectors]);

  const aiActions = useMemo(() => {
    const baseIds = ['managedApis/azureopenai', '/serviceProviders/openai'];
    const allowedIds = isAgenticWorkflow ? [...baseIds, 'connectionProviders/agent'] : baseIds;

    return allConnectors
      .filter((connector) => allowedIds.some((id) => connector.id.includes(id)))
      .map(getOperationGroupCardDataFromConnector);
  }, [allConnectors, isAgenticWorkflow]);

  const favoriteOperations = useMemo(() => {
    const favorites = [
      ...favoriteConnectorsData.map(getOperationGroupCardDataFromConnector),
      ...favoriteActionsData.map(getOperationCardDataFromOperation),
    ];
    return isAgenticWorkflow ? favorites : favorites.filter((f) => f.apiId !== 'connectionProviders/agent');
  }, [favoriteConnectorsData, favoriteActionsData, isAgenticWorkflow]);

  const favoritesLabel = intl.formatMessage({
    defaultMessage: 'Favorites',
    id: 'h4r8HJ',
    description: 'Favorites label',
  });

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

  const builtInLabel = intl.formatMessage({
    defaultMessage: 'Built-in tools',
    id: 'TuSLAk',
    description: 'Built-in tools label',
  });
  const aiCapabilitiesLabel = intl.formatMessage({
    defaultMessage: 'AI capabilities',
    id: 'TfDH7O',
    description: 'AI capabilities label',
  });
  return (
    <Accordion className={classNames.accordion} multiple={true} collapsible={true} openItems={openItems} onToggle={handleToggle}>
      <SpotlightSection
        index={SpotlightCategoryType.Favorites}
        title={favoritesLabel}
        operationsData={favoriteOperations}
        isLoading={isLoadingFavoriteConnectors || (favoriteActionsIsFetching && !favoriteActionsIsFetchingNextPage)}
        isOpen={openItems.includes(SpotlightCategoryType.Favorites)}
        onConnectorSelected={onConnectorSelected}
        onOperationSelected={onOperationSelected}
        filters={filters}
      >
        {favoriteActionsHasNextPage || favoriteActionsIsFetchingNextPage ? (
          <Link className={classNames.favoriteLoadMoreLink} onClick={() => favoriteActionsFetchNextPage()}>
            {favoriteActionsIsFetchingNextPage ? loadingMoreText : loadMoreText}
          </Link>
        ) : null}
      </SpotlightSection>
      <SpotlightSection
        index={SpotlightCategoryType.AICapabilities}
        title={aiCapabilitiesLabel}
        operationsData={aiActions}
        isLoading={isLoadingConnectors}
        isOpen={openItems.includes(SpotlightCategoryType.AICapabilities)}
        onConnectorSelected={onConnectorSelected}
        onOperationSelected={onOperationSelected}
        filters={filters}
      />
      <SpotlightSection
        index={SpotlightCategoryType.BuiltIns}
        title={builtInLabel}
        operationsData={builtInActions}
        isLoading={isLoadingConnectors}
        isOpen={openItems.includes(SpotlightCategoryType.BuiltIns)}
        onConnectorSelected={onConnectorSelected}
        onOperationSelected={onOperationSelected}
        filters={filters}
      />
    </Accordion>
  );
};
