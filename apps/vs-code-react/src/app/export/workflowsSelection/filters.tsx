import type { IDropdownOption } from '../../components/searchableDropdown';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { useIntl } from 'react-intl';
import { useExportStyles } from '../exportStyles';
import { Input, type InputOnChangeData, Label, useId } from '@fluentui/react-components';

interface FiltersProps {
  dropdownOptions: IDropdownOption[];
  onChangeResourceGroup: (event: any, option: IDropdownOption) => void;
  onChangeSearch: (ev: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => void;
  isDataLoading: boolean;
}

export const Filters: React.FC<FiltersProps> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const intl = useIntl();
  const styles = useExportStyles();
  const filterInputId = useId('filter-input');

  const intlText = {
    SEARCH_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Search for logic app',
      id: 'x2g49l',
      description: 'Search for logic app',
    }),
    FILTER_RESOURCE_GROUPS: intl.formatMessage({
      defaultMessage: 'Filter by resource group',
      id: '7KvIpv',
      description: 'Filter by resource group',
    }),
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search...',
      id: 'Xem1jZ',
      description: 'Search placeholder',
    }),
    SEARCH_RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Find and select resource group',
      id: 'xJv0H1',
      description: 'Find and select resource group text',
    }),
  };

  return (
    <div className={styles.exportWorkflowsPanelFilters}>
      <div className={styles.exportWorkflowsPanelFiltersInput}>
        <Label htmlFor={filterInputId} disabled={isDataLoading}>
          {intlText.SEARCH_LOGIC_APP}
        </Label>
        <Input placeholder={intlText.SEARCH} onChange={onChangeSearch} disabled={isDataLoading} id={filterInputId} size="medium" />
      </div>
      <SearchableDropdown
        className={styles.exportWorkflowsPanelFiltersDropdown}
        placeholder={intlText.SEARCH}
        label={intlText.FILTER_RESOURCE_GROUPS}
        multiSelect
        selectedKeys={dropdownOptions.filter((option) => option.selected).map((option) => option.key)}
        options={dropdownOptions}
        onChange={onChangeResourceGroup}
        disabled={isDataLoading || !dropdownOptions.length}
      />
    </div>
  );
};
