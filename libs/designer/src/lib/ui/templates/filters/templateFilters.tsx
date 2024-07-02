import { SearchBox } from '@fluentui/react';
import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter } from '../../../core/state/templates/manifestSlice';
import { useMemo } from 'react';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnectorsOnly } from '../../../core/state/connection/connectionSelector';

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  detailFilters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { availableTemplates, subscriptionId, location } = useSelector((state: RootState) => ({
    availableTemplates: state.manifest.availableTemplates ?? {},
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const allTemplatesUniqueConnectorIds = useMemo(() => {
    const allConnections = Object.values(availableTemplates).flatMap((template) => Object.values(template.connections));
    const uniqueConnectorsFromConnections = getUniqueConnectorsFromConnections(allConnections, subscriptionId, location);
    const uniqueConnectorsIds = [...new Set(uniqueConnectorsFromConnections.map((connector) => connector.connectorId))];
    return uniqueConnectorsIds;
  }, [availableTemplates, location, subscriptionId]);
  const { data: allUniqueConnectors } = useConnectorsOnly(allTemplatesUniqueConnectorIds);

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
        {allUniqueConnectors && allUniqueConnectors.length > 0 && (
          <TemplatesFilterDropdown
            filterName={intlText.CONNECTORS}
            items={allUniqueConnectors?.map((connector) => ({
              value: connector.name,
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
            filterName={filterName}
            items={detailFilters[filterName]}
            onApplyButtonClick={(filterItems) => {
              dispatch(setDetailsFilters({ filterName, filters: filterItems }));
            }}
          />
        ))}
      </div>
    </div>
  );
};
