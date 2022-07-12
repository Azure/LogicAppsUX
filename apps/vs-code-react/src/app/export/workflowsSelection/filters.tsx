import { Dropdown, TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const Filters: React.FC<any> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const intl = useIntl();

  const intlText = {
    SEARCH_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Search for Logic App',
      description: 'Search for logic app',
    }),
    FILTER_RESOURCE_GROUPS: intl.formatMessage({
      defaultMessage: 'Filter by Resource Groups',
      description: 'Filter by resource groups',
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
      <Dropdown
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
