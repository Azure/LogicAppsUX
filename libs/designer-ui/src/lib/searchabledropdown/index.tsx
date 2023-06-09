import type { IDropdownProps } from '@fluentui/react';
import { SearchBox, DropdownMenuItemType, Dropdown } from '@fluentui/react';
import type { FC } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface SearchableDropdownProps {
  dropdownProps: Pick<IDropdownProps, 'options'> & Partial<Omit<IDropdownProps, 'onChange' | 'onDismiss' | 'onRenderItem'>>;
  onItemSelectionChanged: (id: string, isSelected: boolean) => void;
  showFilterItemThreshold?: number;
}

export const SearchableDropdown: FC<SearchableDropdownProps> = ({
  dropdownProps,
  onItemSelectionChanged,
  showFilterItemThreshold,
}): JSX.Element => {
  const showFilterInputItemThreshold = showFilterItemThreshold ?? 4;
  const headerKey = 'FilterHeader';

  const intl = useIntl();

  const [conditionalVisibilityTempArray, setConditionalVisibilityTempArray] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');

  const searchOperation = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder for search box that searches conditional parameters',
  });

  const options = dropdownProps.options.filter((option) => option.text.toLowerCase().includes(filterText.toLowerCase()));

  if (dropdownProps.options.length >= showFilterInputItemThreshold) {
    options.unshift(
      { key: headerKey, text: '', itemType: DropdownMenuItemType.Header },
      { key: 'FilterDivider', text: '-', itemType: DropdownMenuItemType.Divider },
    );
  }

  return (
    <Dropdown
      {...dropdownProps}
      className="msla-searchable-dropdown"
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
