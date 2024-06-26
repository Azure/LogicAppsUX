import { SearchBox } from '@fluentui/react';
import { type FilterObject, TemplatesFilterPill } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter } from '../../../core/state/templates/manifestSlice';

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  detailFilters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ connectors, detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

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
      <div>
        {connectors && (
          <TemplatesFilterPill
            filterName={intlText.CONNECTORS}
            items={connectors}
            onApplyButtonClick={(filterItems) => {
              dispatch(setConnectorsFilters(filterItems));
            }}
          />
        )}
        {Object.keys(detailFilters).map((filterName, index) => (
          <TemplatesFilterPill
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
