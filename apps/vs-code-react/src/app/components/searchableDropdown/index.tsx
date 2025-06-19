import './styles.less';
import { Dropdown, Spinner } from '@fluentui/react-components';
import type { DropdownProps, Option } from '@fluentui/react-components';
import { useState } from 'react';

export interface ISearchableDropdownProps extends DropdownProps {
  isLoading?: boolean;
  searchBoxPlaceholder?: string;
  options: Option[];
}

export const SearchableDropdown: React.FC<ISearchableDropdownProps> = (props) => {
  const [searchText, setSearchText] = useState<string>('');
  const filterHeader = 'FilterHeader';
  const dividerHeader = `Divider_${filterHeader}`;

  const getOptions = (options: Option[]) => {
    const filterOptions = options.filter((option) => {
      if (option.key === filterHeader || option.key === dividerHeader) {
        return true;
      }
      return option.text?.toLowerCase().indexOf(searchText.toLowerCase()) > -1;
    });

    return [{ key: filterHeader, text: '-' }, { key: dividerHeader, text: '-' }, ...filterOptions];
  };

  const spinnerLoader = props.isLoading ? <Spinner className="searchable-dropdown-spinner" size="extra-small" /> : null;

  return (
    <div className="searchable-dropdown">
      <Dropdown
        {...props}
        positioning={{ gapSpace: 10, maxHeight: 400 }}
        options={getOptions(props.options)}
        onOptionSelect={(_, data) => props.onSelectionChange?.(_, data)}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setSearchText('');
          }
        }}
      />
      {spinnerLoader}
    </div>
  );
};
