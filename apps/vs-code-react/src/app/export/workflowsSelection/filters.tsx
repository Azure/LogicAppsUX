import { SearchableDropdown } from '../components/drop';
import { TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface IFiltersProps {
  dropdownOptions: any;
  onChangeResourceGroup: any;
  onChangeSearch: any;
  isDataLoading: boolean;
}

export const Filters: React.FC<IFiltersProps> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const intl = useIntl();

  const intlText = {
    SEARCH_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Search for logic app',
      description: 'Search for logic app',
    }),
    FILTER_RESOURCE_GROUPS: intl.formatMessage({
      defaultMessage: 'Filter by resource group',
      description: 'Filter by resource group',
    }),
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search...',
      description: 'Search placeholder',
    }),
  };

  return (
    <div className="msla-export-workflows-panel-filters">
      <TextField
        className="msla-export-workflows-panel-filters-input"
        placeholder={intlText.SEARCH}
        label={intlText.SEARCH_LOGIC_APP}
        onChange={onChangeSearch}
        disabled={isDataLoading}
      />
      <SearchableDropdown
        className="msla-export-workflows-panel-filters-input"
        placeholder={intlText.SEARCH}
        label={intlText.FILTER_RESOURCE_GROUPS}
        multiSelect
        options={dropdownOptions}
        onChange={onChangeResourceGroup}
        disabled={isDataLoading || !dropdownOptions.length}
      />
    </div>
  );
};
