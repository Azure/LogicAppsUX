import { Dropdown } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface FilterObject {
  value: string;
  displayName: string;
}

interface TemplatesFilterPillProps {
  filterName: string;
  items: FilterObject[];
  onApplyButtonClick: (_filterItems: FilterObject[] | undefined) => void;
}

const allOptionId = 'all';

export const TemplatesFilterDropdown = ({ filterName, items, onApplyButtonClick }: TemplatesFilterPillProps) => {
  const intl = useIntl();
  const [selectedItems, setSelectedItems] = useState<FilterObject[] | undefined>();

  return (
    <Dropdown
      className="msla-templates-filter-dropdown"
      calloutProps={{
        gapSpace: 10,
        calloutMaxHeight: 400,
      }}
      multiSelect
      options={[
        {
          key: allOptionId,
          text: intl.formatMessage({
            defaultMessage: 'All',
            id: 'eaEXYa',
            description: 'Checkbox text for the filter representing all items',
          }),
        },
        ...items.map((item) => ({ key: item.value, text: item.displayName })),
      ]}
      label={filterName}
      selectedKeys={selectedItems?.map((i) => i.value) ?? [allOptionId]}
      onChange={(_e, item, index) => {
        let newSelected = undefined;

        if (index && index > 0) {
          if (item?.selected) {
            const filterObjectItem = items[index - 1]; // -1 to account for the 'All' option
            newSelected = selectedItems ? [...selectedItems, filterObjectItem] : [filterObjectItem];
          } else {
            const updatedSelected = selectedItems?.filter((selectedItem) => selectedItem.value !== item?.key) ?? [];
            newSelected = updatedSelected?.length > 0 ? updatedSelected : undefined;
          }
        }

        setSelectedItems(newSelected);
        onApplyButtonClick(newSelected);
      }}
    />
  );
};
