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

export const TemplatesFilterPill = ({ filterName, items, onApplyButtonClick }: TemplatesFilterPillProps) => {
  const intl = useIntl();
  const [selected, setSelected] = useState<FilterObject[] | undefined>();

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
          key: 'all',
          text: intl.formatMessage({
            defaultMessage: 'All',
            id: 'eaEXYa',
            description: 'Checkbox text for the filter representing all items',
          }),
        },
        ...items.map((item) => ({ key: item.value, text: item.displayName })),
      ]}
      label={filterName}
      selectedKeys={selected?.map((i) => i.value) ?? ['all']}
      onChange={(_e, item, index) => {
        const filterObjectItem = index ? items[index - 1] : undefined;

        let newSelected = undefined;
        if (index === 0) {
          // setSelected(undefined);
        } else if (item?.selected && filterObjectItem) {
          newSelected = selected ? [...selected, filterObjectItem] : [filterObjectItem];
        } else {
          const updatedSelected = selected?.filter((i) => i.value !== item?.key) ?? [];
          newSelected = updatedSelected?.length > 0 ? updatedSelected : undefined;
        }
        setSelected(newSelected);
        onApplyButtonClick(newSelected);
      }}
    />
  );
};
