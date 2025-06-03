import {
  Menu,
  MenuButton,
  MenuGroup,
  MenuGroupHeader,
  MenuItemCheckbox,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { FilterRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import type { MenuCheckedValueChangeData, MenuCheckedValueChangeEvent } from '@fluentui/react-components';
import { useMemo, useState } from 'react';

interface OperationTypeFilter {
  key: string;
  text: string;
  value: string;
}

interface OperationTypeFilterProps {
  actionTypeFilters: OperationTypeFilter[];
  filters?: Record<string, string>;
  setFilters?: (filters: Record<string, string>) => void;
  disabled?: boolean;
}

const ACTION_TYPE = 'actionType';

export const OperationTypeFilter = ({ disabled, actionTypeFilters, filters = {}, setFilters }: OperationTypeFilterProps) => {
  const intl = useIntl();
  const operationTypeKey = ACTION_TYPE;

  const allFilterValues = useMemo(() => actionTypeFilters.map((filter) => filter.value), [actionTypeFilters]);
  const initialCheckedValues = useMemo(
    () => ({ [operationTypeKey]: filters[operationTypeKey] ? [filters[operationTypeKey]] : allFilterValues }),
    [operationTypeKey, filters, allFilterValues]
  );

  const [checkedItems, setCheckedItems] = useState<Record<string, string[]>>(initialCheckedValues);

  const updateFilters = (value?: string) => {
    const updatedFilters = { ...filters };

    if (value) {
      updatedFilters[operationTypeKey] = value;
      setCheckedItems({ [operationTypeKey]: [value] });
    } else {
      delete updatedFilters[operationTypeKey];
      setCheckedItems({ [operationTypeKey]: allFilterValues });
    }

    setFilters?.(updatedFilters);
  };

  const handleCheckedChange = (_event: MenuCheckedValueChangeEvent, data: MenuCheckedValueChangeData) => {
    const selected = data.checkedItems;

    if (selected.length === 1) {
      updateFilters(selected[0]);
    } else if (selected.length === allFilterValues.length) {
      updateFilters();
    }
  };

  const filterLabel = intl.formatMessage({
    defaultMessage: 'Filter by type',
    id: '2JT0E3',
    description: 'Filter by type label',
  });

  return (
    <Menu checkedValues={checkedItems} onCheckedValueChange={handleCheckedChange}>
      <MenuTrigger>
        <MenuButton icon={<FilterRegular />} disabled={disabled} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuGroup>
            <MenuGroupHeader className="msla-filter-operation-type-header">{filterLabel}</MenuGroupHeader>
            {actionTypeFilters.map(({ key, value, text }) => (
              <MenuItemCheckbox key={key} name={operationTypeKey} value={value} className="msla-filter-operation-type-item">
                {text}
              </MenuItemCheckbox>
            ))}
          </MenuGroup>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
