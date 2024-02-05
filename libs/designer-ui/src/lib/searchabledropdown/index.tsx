import type { IDropdownProps } from '@fluentui/react';
import { SearchBox, DropdownMenuItemType, Dropdown } from '@fluentui/react';
import type { FC } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface SearchableDropdownProps {
  dropdownProps: Pick<IDropdownProps, 'options'> & Partial<Omit<IDropdownProps, 'onChange' | 'onDismiss' | 'onRenderItem'>>;
  onItemSelectionChanged: (id: string, isSelected: boolean) => void;
  labelId?: string;
  searchPlaceholderText?: string;
  showSearchItemThreshold?: number;
  className?: string;
}

export const SearchableDropdown: FC<SearchableDropdownProps> = ({
  dropdownProps,
  onItemSelectionChanged,
  searchPlaceholderText,
  showSearchItemThreshold: showFilterItemThreshold,
  className,
  labelId,
}): JSX.Element => {
  const showFilterInputItemThreshold = showFilterItemThreshold ?? 4;
  const headerKey = 'FilterHeader';

  const intl = useIntl();

  const [conditionalVisibilityTempArray, setConditionalVisibilityTempArray] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');

  const searchOperation =
    searchPlaceholderText ??
    intl.formatMessage({
      defaultMessage: 'Search',
      description: 'Default placeholder for search box that searches dropdown options',
    });

  const options = dropdownProps.options.filter((option) => option.text.toLowerCase().includes(filterText.toLowerCase()));

  if (dropdownProps.options.length >= showFilterInputItemThreshold) {
    options.unshift(
      { key: headerKey, text: '', itemType: DropdownMenuItemType.Header },
      { key: 'FilterDivider', text: '-', itemType: DropdownMenuItemType.Divider }
    );
  }

  return (
    <Dropdown
      {...dropdownProps}
      aria-labelledby={labelId}
      className={className ?? 'msla-searchable-dropdown'}
      options={options}
      selectedKeys={conditionalVisibilityTempArray}
      onChange={(_e: any, item: any) => {
        if (item?.key) {
          setConditionalVisibilityTempArray(
            conditionalVisibilityTempArray.includes(item.key)
              ? conditionalVisibilityTempArray.filter((key) => key !== item.key)
              : [...conditionalVisibilityTempArray, item.key]
          );
        }
      }}
      onDismiss={() => {
        conditionalVisibilityTempArray.forEach((parameterId) => {
          onItemSelectionChanged(parameterId, true);
        });
        setConditionalVisibilityTempArray([]);
        setFilterText('');
      }}
      onRenderItem={(item, defaultRenderer) => {
        if (item?.key === headerKey) {
          return (
            <SearchBox
              autoFocus={true}
              className="msla-searchable-dropdown-search"
              onChange={(e, newValue) => setFilterText(newValue ?? '')}
              placeholder={searchOperation}
            />
          );
        }

        return defaultRenderer?.(item) ?? null;
      }}
    />
  );
};
