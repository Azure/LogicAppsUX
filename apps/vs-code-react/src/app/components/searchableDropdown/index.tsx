import './styles.less';
import { Dropdown, DropdownMenuItemType, SearchBox, Spinner, SpinnerSize } from '@fluentui/react';
import type { IDropdownOption, IDropdownProps } from '@fluentui/react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
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
      description: 'Search options description',
    }),
  };

  const renderOption = (option: any): JSX.Element => {
    const searchString = (_event?: ChangeEvent<HTMLInputElement> | undefined, newValue?: string | undefined) => {
      const newString = newValue as string;
      setSearchText(newString);
    };

    const isHeader = option.itemType === DropdownMenuItemType.Header && option.key === filterHeader;

    const searchBox = (
      <div className="searchable-dropdown-searchbox">
        <SearchBox showIcon underlined onChange={searchString} placeholder={props.searchBoxPlaceholder ?? intlText.SEARCH_OPTIONS} />
      </div>
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

  const spinnerLoader = props.isLoading ? <Spinner className="searchable-dropdown-spinner" size={SpinnerSize.xSmall} /> : null;

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
