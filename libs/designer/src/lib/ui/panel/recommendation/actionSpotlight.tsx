import { Link } from '@fluentui/react';
import { Accordion, type AccordionToggleEventHandler, makeStyles, tokens } from '@fluentui/react-components';
import { useAllConnectors, useFavoriteOperations } from '../../../core/queries/browse';
import {
  useDiscoveryPanelFavoriteOperations,
  useDiscoveryPanelRelationshipIds,
  useIsAgentTool,
} from '../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { useMemo, useState } from 'react';
import { equals, LOCAL_STORAGE_KEYS, type Connector, type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { getOperationCardDataFromOperation, getOperationGroupCardDataFromConnector } from './helpers';
import { useIntl } from 'react-intl';
import { SpotlightCategoryType, SpotlightSection } from '@microsoft/designer-ui';
import { useAgenticWorkflow } from '../../../core/state/designerView/designerViewSelectors';
export interface ActionSpotlightProps {
  onConnectorSelected: (connectorId: string, origin?: string) => void;
  onOperationSelected: (operationId: string, apiId?: string) => void;
  filters?: Record<string, string>;
  allOperations: DiscoveryOpArray;
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
  const { filters, allOperations, onConnectorSelected, onOperationSelected } = props;
  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllConnectors();
  const parentGraphId = useDiscoveryPanelRelationshipIds().graphId;
  const isWithinAgenticLoop = useIsWithinAgenticLoop(parentGraphId);

  const isAgentTool = useIsAgentTool();
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

  const getInitialOpenItems = (): SpotlightCategoryType[] => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTION_SPOTLIGHT_OPEN_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Fail silently and fall back to default
    }

    // First-time default
    const defaultItems: SpotlightCategoryType[] = [
      SpotlightCategoryType.BuiltIns,
      SpotlightCategoryType.KnowledgeBase,
      ...(favoriteOperationIds.length > 0 ? [SpotlightCategoryType.Favorites] : []),
    ];
    return defaultItems;
  };

  const [openItems, setOpenItems] = useState<SpotlightCategoryType[]>(getInitialOpenItems);

  const handleToggle: AccordionToggleEventHandler<SpotlightCategoryType> = (_event, data) => {
    setOpenItems(data.openItems);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ACTION_SPOTLIGHT_OPEN_ITEMS, JSON.stringify(data.openItems));
  };

  const classNames = useActionSpotlightStyles();

  const builtInActions = useMemo(() => {
    const allowedIds =
      filters?.['actionType'] === 'triggers'
        ? ['connectionProviders/request', 'connectionProviders/schedule', 'connectionProviders/http']
        : [
            'connectionProviders/control',
            'connectionProviders/dataOperationNew',
            'connectionProviders/datetime',
            'connectionProviders/http',
          ];

    const builtIns = allConnectors
      .filter((connector: Connector) => allowedIds.includes(connector.id))
      .map((connector) => getOperationGroupCardDataFromConnector(connector));

    return builtIns;
  }, [allConnectors, filters]);

  const aiActions = useMemo(() => {
    if (filters?.['actionType'] === 'triggers') {
      return [];
    }

    const baseIds = ['managedApis/azureopenai', '/serviceProviders/openai'];
    const allowedIds = isAgenticWorkflow ? [...baseIds, 'connectionProviders/agent'] : baseIds;

    return allConnectors
      .filter((connector) => allowedIds.some((id) => connector.id.includes(id)))
      .map(getOperationGroupCardDataFromConnector);
  }, [allConnectors, isAgenticWorkflow, filters]);

  const knowledgeBaseActions = useMemo(() => {
    const allowedSuffixes = new Set([
      'httpaction',
      'managedApis/sharepointonline/apiOperations/GetFileItem',
      'managedApis/sharepointonline/apiOperations/GetFileContent',
      'managedApis/sharepointonline/apiOperations/GetFileContentByPath',
      'managedApis/onedriveforbusiness/apiOperations/GetFileMetadata',
      'managedApis/onedriveforbusiness/apiOperations/GetFileMetadataByPath',
      'managedApis/onedriveforbusiness/apiOperations/GetFileContent',
      'managedApis/onedriveforbusiness/apiOperations/GetFileContentByPath',
      'managedApis/onedrive/apiOperations/GetFileMetadata',
      'managedApis/onedrive/apiOperations/GetFileMetadataByPath',
      'managedApis/onedrive/apiOperations/GetFileContent',
      'managedApis/onedrive/apiOperations/GetFileContentByPath',
      'managedApis/amazons3/apiOperations/ListObjects',
      'managedApis/amazons3/apiOperations/GetObjectMetadata',
      'managedApis/amazons3/apiOperations/GetObjectContent',
      'managedApis/dropbox/apiOperations/GetFileMetadata',
      'managedApis/dropbox/apiOperations/GetFileMetadataByPath',
      'managedApis/dropbox/apiOperations/GetFileContent',
      'managedApis/dropbox/apiOperations/GetFileContentByPath',
      'managedApis/service-now/apiOperations/GetKnowledgeArticles',
      'managedApis/service-now/apiOperations/GetRecords',
      'managedApis/service-now/apiOperations/GetRecord',
    ]);
    const AzureBlobServiceProviderIds = ['getBlobMetadata', 'readBlob', 'readBlobFromUri'];

    return allOperations
      .filter((operation) => {
        if (operation?.properties?.api?.id === '/serviceProviders/AzureBlob') {
          for (const id of AzureBlobServiceProviderIds) {
            if (equals(operation.id, id)) {
              return true;
            }
          }
        }
        for (const suffix of allowedSuffixes) {
          if (operation.id.endsWith(suffix)) {
            return true;
          }
        }
        return false;
      })
      .map(getOperationCardDataFromOperation);
  }, [allOperations]);
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
  const knowledgeBaseLabel = intl.formatMessage({
    defaultMessage: 'Knowledge Sources',
    id: 'UQ5Zn2',
    description: 'Knowledge base label',
  });

  const noOperationDescription = intl.formatMessage({
    defaultMessage: 'No Favorite actions or connectors found. Use the Star icon next to existing actions to add them to your favorites.',
    id: 'rPw0Hp',
    description: 'No actions available text',
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
        noOperationDescription={noOperationDescription}
      >
        {favoriteActionsHasNextPage || favoriteActionsIsFetchingNextPage ? (
          <Link className={classNames.favoriteLoadMoreLink} onClick={() => favoriteActionsFetchNextPage()}>
            {favoriteActionsIsFetchingNextPage ? loadingMoreText : loadMoreText}
          </Link>
        ) : null}
      </SpotlightSection>
      {isAgenticWorkflow && (isWithinAgenticLoop || isAgentTool) ? (
        <SpotlightSection
          index={SpotlightCategoryType.KnowledgeBase}
          title={knowledgeBaseLabel}
          operationsData={knowledgeBaseActions}
          isLoading={isLoadingConnectors}
          isOpen={openItems.includes(SpotlightCategoryType.KnowledgeBase)}
          onConnectorSelected={onConnectorSelected}
          onOperationSelected={onOperationSelected}
          filters={filters}
        />
      ) : null}
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
