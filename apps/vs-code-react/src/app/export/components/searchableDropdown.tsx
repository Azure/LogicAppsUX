import { Dropdown, DropdownMenuItemType, SearchBox } from '@fluentui/react';
import type { IDropdownOption, IDropdownProps } from '@fluentui/react';
import { useState } from 'react';
import type { ChangeEvent } from 'react';

export const SearchableDropdown: React.FC<IDropdownProps> = (props) => {
  const [searchText, setSearchText] = useState<string>('');
  const filterHeader = 'FilterHeader';

  const renderOption = (option: any): JSX.Element => {
    const searchString = (_event?: ChangeEvent<HTMLInputElement> | undefined, newValue?: string | undefined) => {
      const newString = newValue as string;
      setSearchText(newString);
    };

    return option.itemType === DropdownMenuItemType.Header && option.key === filterHeader ? (
      <SearchBox showIcon onChange={searchString} underlined={true} placeholder="Search options" />
    ) : (
      <>{option.text}</>
    );
  };

  const getOptions = (options: IDropdownOption[]) => {
    const filterOptions = options.map((option) =>
      !option.disabled && option.text.toLowerCase().indexOf(searchText.toLowerCase()) > -1 ? option : { ...option, hidden: true }
    );

    return [
      { key: filterHeader, text: '-', itemType: DropdownMenuItemType.Header },
      { key: 'divider_filterHeader', text: '-', itemType: DropdownMenuItemType.Divider },
      ...filterOptions,
    ];
  };

  return (
    <Dropdown
      {...props}
      className={`${props.className} searchable-dropdown`}
      options={getOptions(props.options)}
      onRenderOption={renderOption}
      onDismiss={() => setSearchText('')}
    />
  );
};
