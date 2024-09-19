import { Dropdown, SearchBox, Text } from '@fluentui/react';
import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter, setSortKey } from '../../../core/state/templates/manifestSlice';
import { useMemo } from 'react';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnectors } from '../../../core/state/connection/connectionSelector';

export type TemplateDetailFilterType = Record<
  string,
  {
    displayName: string;
    items: FilterObject[];
  }
>;

export interface TemplateFiltersProps {
  detailFilters: TemplateDetailFilterType;
}

export const TemplateFilters = ({ detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const sortKey = useSelector((state: RootState) => state?.manifest?.filters?.sortKey);
  const intl = useIntl();
  const { availableTemplates, subscriptionId, location } = useSelector((state: RootState) => ({
    availableTemplates: state.manifest.availableTemplates ?? {},
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const allTemplatesUniqueConnectorIds = useMemo(() => {
    const allConnections = Object.values(availableTemplates).flatMap((template) => Object.values(template.connections));
    const uniqueConnectorsFromConnections = getUniqueConnectorsFromConnections(allConnections, subscriptionId, location);
    return uniqueConnectorsFromConnections.map((connector) => connector.connectorId);
  }, [availableTemplates, location, subscriptionId]);
  const { data: allUniqueConnectorsEntries } = useConnectors(allTemplatesUniqueConnectorIds);

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
        {allUniqueConnectorsEntries && allUniqueConnectorsEntries.length > 0 && (
          <TemplatesFilterDropdown
            filterName={intlText.CONNECTORS}
            items={allUniqueConnectorsEntries?.map(([connectorId, connector]) => ({
              value: connectorId,
              displayName: connector.properties.displayName,
            }))}
            onApplyButtonClick={(filterItems) => {
              dispatch(setConnectorsFilters(filterItems));
            }}
            isSearchable
          />
        )}
        {Object.keys(detailFilters).map((filterName, index) => (
          <TemplatesFilterDropdown
            key={index}
            filterName={detailFilters[filterName].displayName}
            items={detailFilters[filterName].items}
            onApplyButtonClick={(filterItems) => {
              dispatch(setDetailsFilters({ filterName, filters: filterItems }));
            }}
          />
        ))}
      </div>
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
  );
};
