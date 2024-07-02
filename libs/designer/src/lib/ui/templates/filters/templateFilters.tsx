import { SearchBox } from '@fluentui/react';
import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter } from '../../../core/state/templates/manifestSlice';
import { useMemo } from 'react';
import { getUniqueConnectorsFromConnections } from '../../../core/templates/utils/helper';
import { useConnectorsOnly } from '../../../core/state/connection/connectionSelector';
import { useUniqueConnectorsIds } from '../../../core/queries/template';

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  detailFilters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { subscriptionId, location } = useSelector((state: RootState) => ({
    availableTemplates: state.manifest.availableTemplates ?? {},
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const availableTemplates = useSelector((state: RootState) => state.manifest.availableTemplates) ?? {};

  const templateConnectorsUseMemo = useMemo(() => {
    const allConnectors = Object.values(availableTemplates).flatMap((template) => Object.values(template.connections));
    return getUniqueConnectorsFromConnections(allConnectors, subscriptionId, location);
  }, [availableTemplates, location, subscriptionId]);

  const { data: allTemplateConnectorsWithDisplayName } = useConnectorsOnly(useUniqueConnectorsIds(templateConnectorsUseMemo));

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
        {allTemplateConnectorsWithDisplayName && allTemplateConnectorsWithDisplayName.length > 0 && (
          <TemplatesFilterDropdown
            filterName={intlText.CONNECTORS}
            items={allTemplateConnectorsWithDisplayName?.map((connector) => ({
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
