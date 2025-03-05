import { Dropdown, SearchBox, Text } from '@fluentui/react';
import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter, setSortKey } from '../../../core/state/templates/manifestSlice';
import { useMemo } from 'react';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { Tab, TabList } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import type { Template } from '@microsoft/logic-apps-shared';

type TemplateDetailFilterValue = {
  displayName: string;
  items: FilterObject[];
};

export type TemplateDetailFilterType = Partial<Record<Template.DetailsType, TemplateDetailFilterValue>>;

export interface TemplateFiltersProps {
  detailFilters: TemplateDetailFilterType;
}

const templateDefaultTabKey = 'all';

export const TemplateFilters = ({ detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { sortKey, detailFilters: appliedDetailFilters } = useSelector((state: RootState) => state?.manifest?.filters);
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
    const uniqueConnectorsFromConnections = getUniqueConnectorsFromConnections(allConnectors, subscriptionId, location);
    return uniqueConnectorsFromConnections.map((connector) => connector.connectorId);
  }, [availableTemplates, isConsumption, location, subscriptionId]);
  const selectedTabId = appliedDetailFilters?.Type?.[0]?.value ?? templateDefaultTabKey;

  const intlText = {
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search',
      id: 'IUbVFR',
      description: 'Placeholder text for search templates',
    }),
    CONNECTORS: intl.formatMessage({
      defaultMessage: 'Connectors',
      id: 'KO2eUv',
      description: 'Label text for connectors filter',
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
  };

  const templateDropdownOptions = [
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
    const basicTabs = [
      {
        value: templateDefaultTabKey,
        displayName: intl.formatMessage({
          defaultMessage: 'All',
          id: 'YX0jQs',
          description: 'All templates tab',
        }),
      },
    ];

    if (!isConsumption && !!availableTemplates) {
      basicTabs.push({
        value: 'Workflow',
        displayName: intl.formatMessage({
          defaultMessage: 'Workflows',
          id: 'fxue5l',
          description: 'Workflows only templates tab',
        }),
      });
      basicTabs.push({
        value: 'Accelerator',
        displayName: intl.formatMessage({
          defaultMessage: 'Accelerators',
          id: 'A5/UwX',
          description: 'Accelerators only templates tab',
        }),
      });
    }
    return basicTabs;
  }, [intl, isConsumption, availableTemplates]);

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      dispatch(
        setDetailsFilters({
          filterName: 'Type',
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

  return (
    <div className="msla-templates-filters">
      <div className="msla-templates-filters-search">
        <SearchBox
          placeholder={intlText.SEARCH}
          autoFocus={false}
          onChange={(_e, newValue) => {
            dispatch(setKeywordFilter(newValue));
          }}
        />
      </div>
      <div className="msla-templates-filters-dropdowns">
        {allTemplatesUniqueConnectorIds && allTemplatesUniqueConnectorIds.length > 0 && (
          <TemplatesFilterDropdown
            filterName={intlText.CONNECTORS}
            items={allTemplatesUniqueConnectorIds?.map((connectorId) => ({
              value: connectorId,
              displayName: connectorId.split('/').slice(-1)[0],
            }))}
            onRenderItem={(item) => <ConnectorName data={item} />}
            onApplyButtonClick={(filterItems) => {
              dispatch(setConnectorsFilters(filterItems));
            }}
            isSearchable
          />
        )}
        {(Object.keys(detailFilters) as Template.DetailsType[]).map((filterName, index) =>
          detailFilters[filterName] ? (
            <TemplatesFilterDropdown
              key={index}
              filterName={detailFilters[filterName].displayName}
              items={detailFilters[filterName].items}
              onApplyButtonClick={(filterItems) => {
                dispatch(setDetailsFilters({ filterName, filters: filterItems }));
              }}
            />
          ) : null
        )}
      </div>
      <div className="msla-templates-filters-row">
        <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected}>
          {templateTabs.map(({ value, displayName }) => (
            <Tab key={value} id={value} value={value}>
              {displayName}
            </Tab>
          ))}
        </TabList>

        <div className="msla-templates-filters-sort">
          <Text>{intlText.SORT_BY}</Text>
          <Dropdown
            className="msla-templates-filters-sort-dropdown"
            options={templateDropdownOptions}
            selectedKey={sortKey as string}
            onChange={(_e, item) => {
              if (item?.key) {
                dispatch(setSortKey(item?.key as string));
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const ConnectorName = ({ data }: { data: any }) => {
  const { data: connector, isLoading } = useConnector(data.key, /* enabled */ true, /* getCachedData */ true);
  return <Text>{isLoading ? data.key.split('/').slice(-1)[0] : connector?.properties.displayName}</Text>;
};
