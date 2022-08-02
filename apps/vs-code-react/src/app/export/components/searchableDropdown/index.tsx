import './styles.less';
import { Dropdown, DropdownMenuItemType, SearchBox } from '@fluentui/react';
import type { IDropdownOption, IDropdownProps } from '@fluentui/react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useIntl } from 'react-intl';

export const SearchableDropdown: React.FC<IDropdownProps> = (props) => {
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
      <div className="searchable-dropdown">
        <SearchBox showIcon underlined onChange={searchString} placeholder={intlText.SEARCH_OPTIONS} />
      </div>
    );

    return isHeader ? searchBox : <>{option.text}</>;
  };

  const getOptions = (options: IDropdownOption[]) => {
    const filterOptions = options.map((option) =>
      !option.disabled && option.text.toLowerCase().indexOf(searchText.toLowerCase()) > -1 ? option : { ...option, hidden: true }
    );

    return [
      { key: filterHeader, text: '-', itemType: DropdownMenuItemType.Header },
      { key: dividerHeader, text: '-', itemType: DropdownMenuItemType.Divider },
      ...filterOptions,
    ];
  };

  return (
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
  );
};
