import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter, setSortKey } from '../../../core/state/templates/manifestSlice';
import { useEffect, useMemo, useState } from 'react';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { Field, Tab, TabList } from '@fluentui/react-components';
import { type SelectTabData, type SelectTabEvent, SearchBox, Text, Option, Dropdown } from '@fluentui/react-components';
import { css } from '@fluentui/utilities';
import type { Template } from '@microsoft/logic-apps-shared';

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
  tabDetails?: GalleryTab[];
  detailFilters: TemplateDetailFilterType;
  showFilters?: boolean;
  searchPlaceholder?: string;
  cssOverrides?: Record<string, string>;
}

const templateDefaultTabKey = 'all';
const tabFilterKey = 'publishedBy';

export const TemplateSearchAndFilters = ({
  tabDetails,
  searchPlaceholder,
  showFilters = true,
  detailFilters,
  cssOverrides,
}: TemplateSearchAndFilterProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sortKey, detailFilters: appliedDetailFilters } = useSelector((state: RootState) => state?.manifest?.filters);
  const intl = useIntl();
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

  const sortOptions = [
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
        name: 'Microsoft',
        displayName: intlText.MICROSOFT_AUTHORED,
        filterKey: tabFilterKey,
      });
    }
    return basicTabs;
  }, [intl, tabDetails, availableTemplates, intlText.MY_TEMPLATES, intlText.MICROSOFT_AUTHORED]);

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
    <div className="msla-templates-search-and-filters">
      <div className="msla-templates-search-and-sort">
        <SearchBox
          className="msla-templates-filters-search-box"
          placeholder={placeholderText}
          aria-label={placeholderText}
          autoFocus={false}
          onChange={(_e, data) => {
            dispatch(setKeywordFilter(data.value));
          }}
        />
        <Field className="msla-templates-filters-sort" label={intlText.SORT_BY} orientation="horizontal">
          <Dropdown
            className="msla-templates-filters-sort-dropdown"
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
      </div>

      {showFilters && <Filters detailFilters={detailFilters} />}

      <div className={css('msla-templates-filters-tabs', cssOverrides?.tabs)}>
        <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected}>
          {templateTabs.map((tab) => (
            <Tab key={tab.name} id={tab.name} value={tab.name}>
              {tab.displayName}
            </Tab>
          ))}
        </TabList>
      </div>
    </div>
  );
};

const Filters = ({ detailFilters }: { detailFilters: TemplateDetailFilterType }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { isConsumption, availableTemplates, subscriptionId, location } = useSelector((state: RootState) => ({
    isConsumption: state.workflow.isConsumption,
    availableTemplates: state.manifest.availableTemplates ?? {},
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
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

  const intlText = {
    CONNECTORS: intl.formatMessage({
      defaultMessage: 'Connectors',
      id: 'KO2eUv',
      description: 'Label text for connectors filter',
    }),
  };

  return (
    <div className="msla-templates-filters-dropdowns">
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
          isSearchable
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
