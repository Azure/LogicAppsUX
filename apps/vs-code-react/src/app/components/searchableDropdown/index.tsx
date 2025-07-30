import './styles.less';
import { Dropdown, DropdownMenuItemType } from '@fluentui/react';
import type { IDropdownOption, IDropdownProps } from '@fluentui/react';
import type { InputOnChangeData, SearchBoxChangeEvent } from '@fluentui/react-components';
import { SearchBox, Spinner } from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface ISearchableDropdownProps extends IDropdownProps {
  isLoading?: boolean;
  searchBoxPlaceholder?: string;
}

export const SearchableDropdown: React.FC<ISearchableDropdownProps> = (props) => {
  const [searchText, setSearchText] = useState<string>('');
  const filterHeader = 'FilterHeader';
  const dividerHeader = `Divider_${filterHeader}`;

  const intl = useIntl();

  const intlText = {
    SEARCH_OPTIONS: intl.formatMessage({
      defaultMessage: 'Search options',
      id: 'R7LyKb',
      description: 'Search options description',
    }),
  };

  const renderOption = (option: any): JSX.Element => {
    const onSearch: (ev: SearchBoxChangeEvent, data: InputOnChangeData) => void = (_, data) => {
      const newString = data.value;
      setSearchText(newString);
    };

    const isHeader = option.itemType === DropdownMenuItemType.Header && option.key === filterHeader;

    const searchBox = (
      <SearchBox style={{ width: '100%' }} onChange={onSearch} placeholder={props.searchBoxPlaceholder ?? intlText.SEARCH_OPTIONS} />
    );

    return isHeader ? searchBox : <>{option.text}</>;
  };

  const getOptions = (options: IDropdownOption[]) => {
    const filterOptions = options.map((option) => {
      if (option.itemType === DropdownMenuItemType.Header || option.itemType === DropdownMenuItemType.Divider) {
        return option;
      }

      return option.text.toLowerCase().indexOf(searchText.toLowerCase()) > -1 ? option : { ...option, hidden: true };
    });

    return [
      { key: filterHeader, text: '-', itemType: DropdownMenuItemType.Header },
      { key: dividerHeader, text: '-', itemType: DropdownMenuItemType.Divider },
      ...filterOptions,
    ];
  };

  const spinnerLoader = props.isLoading ? <Spinner className="searchable-dropdown-spinner" size="extra-small" /> : null;

  return (
    <div className="searchable-dropdown">
      <Dropdown
        {...props}
        calloutProps={{
          gapSpace: 10,
          calloutMaxHeight: 400,
        }}
        options={getOptions(props.options)}
        onRenderOption={renderOption}
        onDismiss={() => setSearchText('')}
      />
      {spinnerLoader}
    </div>
  );
};
