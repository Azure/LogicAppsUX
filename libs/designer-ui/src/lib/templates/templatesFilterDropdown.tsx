import { Dropdown, type IDropdownOption, type ISelectableOption, SearchBox, SelectableOptionMenuItemType } from '@fluentui/react';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import Fuse from 'fuse.js';

export interface FilterObject {
  value: string;
  displayName: string;
}

interface InternalFilterObject extends FilterObject {
  hidden?: boolean;
}

interface TemplatesFilterDropdownProps {
  filterName: string;
  items: FilterObject[];
  onRenderItem?: (item: ISelectableOption) => JSX.Element;
  onApplyButtonClick: (_filterItems: FilterObject[] | undefined) => void;
  isSearchable?: boolean;
  selectedItems?: FilterObject[] | undefined;
  disabled?: boolean;
  placeholder?: string;
}

const allOptionId = 'all';

export const TemplatesFilterDropdown = ({
  filterName,
  items,
  onApplyButtonClick,
  onRenderItem,
  isSearchable = false,
  disabled = false,
  selectedItems: initialSelectedItems,
  placeholder,
}: TemplatesFilterDropdownProps) => {
  const intl = useIntl();
  const [displayItems, setDisplayItems] = useState<InternalFilterObject[]>(items);
  const [selectedItems, setSelectedItems] = useState<InternalFilterObject[] | undefined>(initialSelectedItems);

  useEffect(() => {
    if (items) {
      setDisplayItems(items);
    }
  }, [items]);

  const dropdownHeadersCount = isSearchable ? 2 : 1; // For the 'All' option (and the SearchBox)

  const fuse = new Fuse(items, {
    isCaseSensitive: false,
    threshold: 0.1,
    keys: ['value', 'displayName'],
  });

  const intlText = {
    ALL: intl.formatMessage({
      defaultMessage: 'All',
      id: 'eaEXYa',
      description: 'Checkbox text for the filter representing all items',
    }),
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search',
      id: '6DZp5H',
      description: 'Placeholder text for search connectors',
    }),
  };

  const dropdownOptions: IDropdownOption[] = useMemo(() => {
    const result: IDropdownOption[] = [];

    if (isSearchable) {
      result.push({
        key: 'search',
        text: '',
        itemType: SelectableOptionMenuItemType.Header,
      });
    }

    return result.concat([
      {
        key: allOptionId,
        text: intlText.ALL,
        itemType: SelectableOptionMenuItemType.SelectAll,
      },
      ...displayItems.map((item) => ({ key: item.value, text: item.displayName, hidden: item.hidden })),
    ]);
  }, [displayItems, isSearchable, intlText.ALL]);

  const onRenderOption = (option?: ISelectableOption, defaultRender?: (props?: ISelectableOption) => JSX.Element | null) => {
    if (!option || option?.hidden) {
      return null;
    }

    if (option.itemType === SelectableOptionMenuItemType.Header && option.key === 'search') {
      return (
        <SearchBox
          placeholder={intlText.SEARCH}
          autoFocus={false}
          onChange={(_e, newValue) => {
            if (!newValue) {
              setDisplayItems(items);
              return;
            }
            if (newValue) {
              const searchedItems = fuse.search(newValue).map(({ item }) => item);
              setDisplayItems(
                items.map((item) => ({
                  ...item,
                  hidden: !(item.value === allOptionId || searchedItems.includes(item)),
                }))
              );
            }
          }}
        />
      );
    }
    return onRenderItem && option.key !== allOptionId ? onRenderItem(option) : (defaultRender?.(option) ?? null);
  };

  return (
    <Dropdown
      styles={{ title: { borderRadius: '4px' } }}
      className="msla-templates-filter-dropdown"
      calloutProps={{
        gapSpace: 10,
        calloutMaxHeight: 400,
      }}
      multiSelect
      options={dropdownOptions}
      label={filterName}
      placeholder={placeholder}
      disabled={disabled}
      selectedKeys={selectedItems?.map((i) => i.value) ?? [allOptionId]}
      onRenderOption={onRenderOption}
      onChange={(_e, item, index) => {
        let newSelected = undefined;

        if (index && index >= dropdownHeadersCount) {
          if (item?.selected) {
            const filterObjectItem = displayItems[index - dropdownHeadersCount];
            newSelected = selectedItems ? [...selectedItems, filterObjectItem] : [filterObjectItem];
          } else {
            const updatedSelected = selectedItems?.filter((selectedItem) => selectedItem.value !== item?.key) ?? [];
            newSelected = updatedSelected?.length > 0 ? updatedSelected : undefined;
          }
        }
        setSelectedItems(newSelected);
        onApplyButtonClick(newSelected);
      }}
      onDismiss={() => {
        setDisplayItems(items);
      }}
    />
  );
};
