import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import {
  setConnectorsFilters,
  setDetailsFilters,
  setKeywordFilter,
  setSortKey,
  setStatusFilters,
  setSubscriptionsFilters,
} from '../../../core/state/templates/manifestSlice';
import { useEffect, useMemo, useState } from 'react';
import { getTemplatePublishCategories, getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { Field, Tab, TabList, Dropdown, Option, mergeClasses } from '@fluentui/react-components';
import { type SelectTabData, type SelectTabEvent, SearchBox, Text } from '@fluentui/react-components';
import { useTemplateSearchFiltersStyles } from './templatesearchfilters.styles';
import type { Template } from '@microsoft/logic-apps-shared';
import { useSubscriptions } from '../../../core/queries/resource';

type TemplateDetailFilterValue = {
  displayName: string;
  items: FilterObject[];
};

export type TemplateDetailFilterType = Partial<Record<Template.DetailsType, TemplateDetailFilterValue>>;

interface GalleryTab {
  displayName: string;
  name: string;
  filterKey?: string;
}

export interface TemplateSearchAndFilterProps {
  tabFilterKey?: string;
  tabDetails?: GalleryTab[];
  detailFilters: TemplateDetailFilterType;
  showFilters?: boolean;
  searchPlaceholder?: string;
  cssOverrides?: Record<string, string>;
}

export const useSortOptions = () => {
  const intl = useIntl();
  return [
    {
      key: 'a-to-z',
      text: intl.formatMessage({
        defaultMessage: 'A to Z, ascending',
        id: 'zxF7g+',
        description: 'Sort by dropdown option of A to Z ascending',
      }),
    },
    {
      key: 'z-to-a',
      text: intl.formatMessage({
        defaultMessage: 'Z to A, descending',
        id: '1jf3Dq',
        description: 'Sort by dropdown option of Z to A descending',
      }),
    },
  ];
};

const SortDropdown = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { sortKey } = useSelector((state: RootState) => state?.manifest?.filters);
  const sortOptions = useSortOptions();
  const styles = useTemplateSearchFiltersStyles();

  const intlText = {
    SORT_BY: intl.formatMessage({
      defaultMessage: 'Sort By',
      id: 'ZOIvqN',
      description: 'Label text for sort by filter',
    }),
  };

  return (
    <Field className={styles.sortField} label={intlText.SORT_BY} orientation="horizontal">
      <Dropdown
        className={styles.sortDropdown}
        onOptionSelect={(e, option) => dispatch(setSortKey(option.optionValue as string))}
        value={sortOptions.find((op) => op.key === sortKey)?.text}
        selectedOptions={[sortKey]}
        size="small"
      >
        {sortOptions.map((op) => (
          <Option key={op.key} value={op.key}>
            {op.text}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
};

const templateDefaultTabKey = 'all';
const microsoftAuthoredTabKey = 'Microsoft';

export const TemplateSearchAndFilters = ({
  tabFilterKey = 'Type',
  tabDetails,
  searchPlaceholder,
  showFilters = true,
  detailFilters,
  cssOverrides,
}: TemplateSearchAndFilterProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { detailFilters: appliedDetailFilters } = useSelector((state: RootState) => state?.manifest?.filters);
  const intl = useIntl();
  const styles = useTemplateSearchFiltersStyles();
  const { availableTemplates } = useSelector((state: RootState) => ({
    isConsumption: state.workflow.isConsumption,
    availableTemplates: state.manifest.availableTemplates ?? {},
  }));
  const selectedTabId = appliedDetailFilters?.[tabFilterKey]?.[0]?.value ?? templateDefaultTabKey;

  const intlText = {
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search',
      id: 'IUbVFR',
      description: 'Placeholder text for search templates',
    }),
    TYPE: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'wfekJ7',
      description: 'Label text for type filter',
    }),
    SORT_BY: intl.formatMessage({
      defaultMessage: 'Sort By',
      id: 'ZOIvqN',
      description: 'Label text for sort by filter',
    }),
    MY_TEMPLATES: intl.formatMessage({
      defaultMessage: 'My Templates',
      id: 'aWcxdZ',
      description: 'Label text custom templates tab',
    }),
    MICROSOFT_AUTHORED: intl.formatMessage({
      defaultMessage: 'Microsoft Authored',
      id: 'VjvWve',
      description: 'Label text for Microsoft authored templates tab',
    }),
  };

  const templateTabs = useMemo(() => {
    const basicTabs: GalleryTab[] = [
      {
        name: templateDefaultTabKey,
        displayName: intl.formatMessage({
          defaultMessage: 'All',
          id: 'YX0jQs',
          description: 'All templates tab',
        }),
        filterKey: tabFilterKey,
      },
    ];

    if (tabDetails) {
      return [...basicTabs, ...tabDetails];
    }

    if (availableTemplates) {
      basicTabs.push({
        name: 'Custom',
        displayName: intlText.MY_TEMPLATES,
        filterKey: tabFilterKey,
      });
      basicTabs.push({
        name: microsoftAuthoredTabKey,
        displayName: intlText.MICROSOFT_AUTHORED,
        filterKey: tabFilterKey,
      });
    }
    return basicTabs;
  }, [intl, tabDetails, tabFilterKey, availableTemplates, intlText.MY_TEMPLATES, intlText.MICROSOFT_AUTHORED]);

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      const tabValue = templateTabs.find((tab) => tab.name === itemKey) as GalleryTab;
      dispatch(
        setDetailsFilters({
          filterName: tabValue.filterKey as string,
          filters:
            itemKey === templateDefaultTabKey
              ? undefined
              : [
                  {
                    displayName: itemKey,
                    value: itemKey,
                  },
                ],
        })
      );
    }
  };

  const placeholderText = searchPlaceholder ?? intlText.SEARCH;
  return (
    <div className={styles.root}>
      <div className={styles.searchBoxContainer}>
        <SearchBox
          className={styles.searchBox}
          placeholder={placeholderText}
          aria-label={placeholderText}
          autoFocus={false}
          onChange={(_e, data) => {
            dispatch(setKeywordFilter(data.value));
          }}
        />
      </div>

      {showFilters && <Filters tabFilterKey={tabFilterKey} detailFilters={detailFilters} />}

      <div className={mergeClasses(styles.filtersTabs, cssOverrides?.tabs)}>
        <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected}>
          {templateTabs.map((tab) => (
            <Tab key={tab.name} id={tab.name} value={tab.name}>
              {tab.displayName}
            </Tab>
          ))}
        </TabList>
        <SortDropdown />
      </div>
    </div>
  );
};

const Filters = ({ detailFilters, tabFilterKey }: { detailFilters: TemplateDetailFilterType; tabFilterKey: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useTemplateSearchFiltersStyles();
  const { isConsumption, availableTemplates, subscriptionId, location, selectedSubscriptions, appliedDetailFilters } = useSelector(
    (state: RootState) => ({
      isConsumption: state.workflow.isConsumption,
      availableTemplates: state.manifest.availableTemplates ?? {},
      subscriptionId: state.workflow.subscriptionId,
      location: state.workflow.location,
      selectedSubscriptions: state.manifest.filters.subscriptions,
      appliedDetailFilters: state.manifest.filters.detailFilters,
    })
  );

  const disableStatusFilter = useMemo(
    () => appliedDetailFilters?.[tabFilterKey]?.[0]?.value === microsoftAuthoredTabKey,
    [appliedDetailFilters, tabFilterKey]
  );
  const publishCategories = useMemo(() => getTemplatePublishCategories(), []);
  const allTemplatesUniqueConnectorIds = useMemo(() => {
    const skuTemplates = Object.values(availableTemplates).filter((templateManifest) =>
      templateManifest.skus.includes(isConsumption ? 'consumption' : 'standard')
    );
    const allConnectors = Object.values(skuTemplates).flatMap((template) => template.featuredConnectors ?? []);
    const uniqueConnectorsFromConnections = getUniqueConnectorsFromConnections(
      allConnectors,
      subscriptionId,
      location,
      /* removeBuiltInConnectors */ true
    );
    return uniqueConnectorsFromConnections.map((connector) => connector.id);
  }, [availableTemplates, isConsumption, location, subscriptionId]);
  const [allConnectorsData, setConnectorsData] = useState<Record<string, string>>({});
  const connectorOptions = useMemo(() => {
    return allTemplatesUniqueConnectorIds?.map((connectorId) => ({
      value: connectorId,
      displayName: allConnectorsData[connectorId] ?? connectorId.split('/').slice(-1)[0],
    }));
  }, [allConnectorsData, allTemplatesUniqueConnectorIds]);
  const { data: subscriptions, isLoading: isSubscriptionsLoading } = useSubscriptions();
  const subscriptionOptions = useMemo(
    () =>
      subscriptions?.map((sub) => ({
        value: sub.name,
        displayName: sub.displayName,
      })) ?? [],
    [subscriptions]
  );

  const intlText = {
    CONNECTORS: intl.formatMessage({
      defaultMessage: 'Connectors',
      id: 'KO2eUv',
      description: 'Label text for connectors filter',
    }),
    SUBSCRIPTIONS: intl.formatMessage({
      defaultMessage: 'Subscriptions',
      id: 'woJtvu',
      description: 'Label text for subscriptions filter',
    }),
    STATUS: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'xkCRtu',
      description: 'Label text for status filter',
    }),
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading...',
      id: 'MFg+49',
      description: 'Loading text for the dropdown',
    }),
  };

  return (
    <div className={styles.filtersDropdowns}>
      <TemplatesFilterDropdown
        filterName={intlText.SUBSCRIPTIONS}
        items={subscriptionOptions}
        selectedItems={selectedSubscriptions}
        disabled={isSubscriptionsLoading}
        placeholder={isSubscriptionsLoading ? intlText.LOADING : ''}
        onApplyButtonClick={(filterItems) => {
          dispatch(setSubscriptionsFilters(filterItems));
        }}
        isSearchable={true}
      />
      {allTemplatesUniqueConnectorIds && allTemplatesUniqueConnectorIds.length > 0 && (
        <TemplatesFilterDropdown
          filterName={intlText.CONNECTORS}
          items={connectorOptions}
          onRenderItem={(item) => (
            <ConnectorName
              data={item}
              setDisplayName={(displayName) => {
                if (!allConnectorsData[item.key]) {
                  setConnectorsData({ ...allConnectorsData, [item.key]: displayName });
                }
              }}
            />
          )}
          onApplyButtonClick={(filterItems) => {
            dispatch(setConnectorsFilters(filterItems));
          }}
          isSearchable={true}
        />
      )}
      {Object.entries(detailFilters).map(([filterName, filterItem], index) => (
        <TemplatesFilterDropdown
          key={index}
          filterName={filterItem.displayName}
          items={filterItem.items}
          onApplyButtonClick={(filterItems) => {
            dispatch(setDetailsFilters({ filterName, filters: filterItems }));
          }}
        />
      ))}
      <TemplatesFilterDropdown
        filterName={intlText.STATUS}
        disabled={disableStatusFilter}
        items={publishCategories}
        onApplyButtonClick={(filterItems) => {
          dispatch(setStatusFilters(filterItems));
        }}
      />
    </div>
  );
};

const ConnectorName = ({ data, setDisplayName }: { data: any; setDisplayName: (displayName: string) => void }) => {
  const { data: connector, isLoading } = useConnector(data.key, /* enabled */ true, /* getCachedData */ true);

  useEffect(() => {
    if (!isLoading && connector?.properties?.displayName) {
      setDisplayName(connector.properties.displayName);
    }
  }, [connector, isLoading, setDisplayName]);
  return <Text>{isLoading ? data.key.split('/').slice(-1)[0] : connector?.properties?.displayName}</Text>;
};
