import type { IDropdownOption } from '../../components/searchableDropdown';
import { SearchableDropdown } from '../../components/searchableDropdown';
import { useExportStyles } from '../exportStyles';
import { Input, type InputOnChangeData, Label, useId } from '@fluentui/react-components';
import { useIntlMessages, exportMessages } from '../../../intl';

interface FiltersProps {
  dropdownOptions: IDropdownOption[];
  onChangeResourceGroup: (event: any, option: IDropdownOption) => void;
  onChangeSearch: (ev: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => void;
  isDataLoading: boolean;
}

export const Filters: React.FC<FiltersProps> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const styles = useExportStyles();
  const filterInputId = useId('filter-input');

  const intlText = useIntlMessages(exportMessages);

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
