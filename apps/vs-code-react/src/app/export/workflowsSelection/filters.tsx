import { SearchableDropdown } from '../../components/searchableDropdown';
import { TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const Filters: React.FC<any> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const intl = useIntl();

  const intlText = {
    SEARCH_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Search for logic app',
      id: 'c76838f6543e',
      description: 'Search for logic app',
    }),
    FILTER_RESOURCE_GROUPS: intl.formatMessage({
      defaultMessage: 'Filter by resource group',
      id: 'ecabc8a6fc73',
      description: 'Filter by resource group',
    }),
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search...',
      id: '5de9b58d9465',
      description: 'Search placeholder',
    }),
    SEARCH_RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Find and select resource group',
      id: 'c49bf41f5a30',
      description: 'Find and select resource group text',
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
        className="msla-export-workflows-panel-filters-dropdown"
        placeholder={intlText.SEARCH}
        label={intlText.FILTER_RESOURCE_GROUPS}
        multiSelect
        options={dropdownOptions}
        onChange={onChangeResourceGroup}
        disabled={isDataLoading || !dropdownOptions.length}
        searchBoxPlaceholder={intlText.SEARCH_RESOURCE_GROUP}
      />
    </div>
  );
};
