import { Dropdown, SearchBox } from '@fluentui/react';
import { type FilterObject, TemplatesFilterDropdown } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectorsFilters, setDetailsFilters, setKeywordFilter, setSortKey } from '../../../core/state/templates/manifestSlice';

export interface TemplateFiltersProps {
  connectors?: FilterObject[];
  detailFilters: Record<string, FilterObject[]>;
}

export const TemplateFilters = ({ connectors, detailFilters }: TemplateFiltersProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const sortKey = useSelector((state: RootState) => state?.manifest?.filters?.sortKey);
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
        {connectors && (
          <TemplatesFilterDropdown
            filterName={intlText.CONNECTORS}
            items={connectors}
            onApplyButtonClick={(filterItems) => {
              dispatch(setConnectorsFilters(filterItems));
            }}
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
      <div className="msla-templates-filters-sort">
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
