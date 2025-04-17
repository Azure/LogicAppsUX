import { SearchableDropdown } from '../../components/searchableDropdown';
import { type IDropdownOption, TextField } from '@fluentui/react';
import { useExportStrings } from 'assets/strings';

interface IFiltersProps {
  dropdownOptions: IDropdownOption[];
  onChangeResourceGroup: (
    event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption<any> | undefined,
    index?: number | undefined
  ) => void;
  onChangeSearch: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => void;
  isDataLoading: boolean;
}

export const Filters: React.FC<IFiltersProps> = ({ dropdownOptions, onChangeResourceGroup, onChangeSearch, isDataLoading }) => {
  const { SEARCH, SEARCH_LOGIC_APP, FILTER_RESOURCE_GROUPS, SEARCH_RESOURCE_GROUP } = useExportStrings();

  return (
    <div className="msla-export-workflows-panel-filters">
      <TextField
        className="msla-export-workflows-panel-filters-input"
        placeholder={SEARCH}
        label={SEARCH_LOGIC_APP}
        onChange={onChangeSearch}
        disabled={isDataLoading}
      />
      <SearchableDropdown
        className="msla-export-workflows-panel-filters-dropdown"
        placeholder={SEARCH}
        label={FILTER_RESOURCE_GROUPS}
        multiSelect
        options={dropdownOptions}
        onChange={onChangeResourceGroup}
        disabled={isDataLoading || !dropdownOptions.length}
        searchBoxPlaceholder={SEARCH_RESOURCE_GROUP}
      />
    </div>
  );
};
