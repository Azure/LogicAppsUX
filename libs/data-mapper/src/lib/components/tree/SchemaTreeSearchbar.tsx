import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { Stack } from '@fluentui/react';
import {
  Button,
  Input,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { Dismiss20Regular, Filter20Regular, Checkmark20Filled } from '@fluentui/react-icons';
import { NormalizedDataType, SchemaNodeProperty } from '@microsoft/utils-logic-apps';
import { useDebouncedCallback } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const searchDebounceDelay = 300;

export const arrayType = 'Array';
const selectAll = 'selectAll';
type DataTypeFilterKeys = NormalizedDataType | typeof arrayType;
export type FilteredDataTypesDict = { [key in DataTypeFilterKeys]: boolean };

export const getDefaultFilteredDataTypesDict = (): FilteredDataTypesDict => {
  const defaultFilteredDataTypesDict = {} as FilteredDataTypesDict;

  Object.values(NormalizedDataType).forEach((dataTypeValue) => {
    defaultFilteredDataTypesDict[dataTypeValue] = true;
  });

  defaultFilteredDataTypesDict[arrayType] = true;

  return defaultFilteredDataTypesDict;
};

const useStyles = makeStyles({
  searchbar: {
    width: '100%',
    marginBottom: '6px',
  },
});

interface SchemaTreeSearchbarProps {
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
  filteredDataTypes: FilteredDataTypesDict;
  setFilteredDataTypes: (newDict: FilteredDataTypesDict) => void;
}

export const SchemaTreeSearchbar = ({ onSearch, onClear, filteredDataTypes, setFilteredDataTypes }: SchemaTreeSearchbarProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const [searchTerm, setSearchTerm] = useState<string>('');

  const searchLoc = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Search',
  });

  const clearLoc = intl.formatMessage({
    defaultMessage: 'Clear',
    description: 'Clear',
  });

  const filterLoc = intl.formatMessage({
    defaultMessage: 'Filter by data type',
    description: 'Filter by data type',
  });

  const setSearchValue = (newValue: string) => {
    setSearchTerm(newValue);
    onChangeSearchValueDebounced(newValue);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onClear();
  };

  const onChangeSearchValueDebounced = useDebouncedCallback(onSearch, [], searchDebounceDelay);

  const onClickDataType = (dataType: NormalizedDataType | typeof arrayType | typeof selectAll, toggledOn: boolean) => {
    const newFilteredDataTypes: FilteredDataTypesDict = { ...filteredDataTypes };

    if (dataType === selectAll) {
      Object.keys(filteredDataTypes).forEach((dataTypeKey) => {
        newFilteredDataTypes[dataTypeKey as DataTypeFilterKeys] = toggledOn;
      });
    } else {
      newFilteredDataTypes[dataType] = toggledOn;
    }

    setFilteredDataTypes({ ...newFilteredDataTypes });
  };

  const searchbarInteractions: JSX.Element = (
    <>
      {searchTerm && (
        <Tooltip content={clearLoc} relationship="description">
          <Button icon={<Dismiss20Regular />} appearance="subtle" onClick={clearSearch} aria-label={clearLoc} size="small" />
        </Tooltip>
      )}

      <Menu persistOnItemClick>
        <MenuTrigger>
          <Tooltip content={filterLoc} relationship="description">
            <Button icon={<Filter20Regular />} appearance="subtle" aria-label={filterLoc} size="small" />
          </Tooltip>
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <MenuItem onClick={() => onClickDataType(selectAll, !Object.values(filteredDataTypes).every((isFiltered) => !!isFiltered))}>
              <Stack horizontal verticalAlign="center">
                <Checkmark20Filled
                  style={{
                    visibility: Object.values(filteredDataTypes).some((isFiltered) => !isFiltered) ? 'hidden' : 'visible',
                    marginRight: 2,
                  }}
                />
                <Text style={{ color: tokens.colorBrandForegroundLink }}>Select all</Text>
              </Stack>
            </MenuItem>

            {Object.entries(NormalizedDataType).flatMap(([dataTypeKey, dataTypeValue]) => {
              const getMenuItemForDataType = (dataTypeKey: string, dataTypeValue: DataTypeFilterKeys) => {
                const DataTypeIcon =
                  dataTypeValue === arrayType
                    ? iconForNormalizedDataType(NormalizedDataType.Complex, 24, true, [SchemaNodeProperty.Repeating])
                    : iconForNormalizedDataType(dataTypeValue, 24, true);

                return (
                  <MenuItem key={dataTypeKey} onClick={() => onClickDataType(dataTypeValue, !filteredDataTypes[dataTypeValue])}>
                    <Stack horizontal verticalAlign="center">
                      <Checkmark20Filled style={{ visibility: filteredDataTypes[dataTypeValue] ? 'visible' : 'hidden' }} />
                      <DataTypeIcon
                        style={{
                          marginRight: 4,
                          height: 20,
                          color: filteredDataTypes[dataTypeValue] ? tokens.colorCompoundBrandForeground1 : undefined,
                        }}
                        filled={filteredDataTypes[dataTypeValue]}
                      />
                      <Text>{dataTypeKey}</Text>
                    </Stack>
                  </MenuItem>
                );
              };

              const menuItems = [getMenuItemForDataType(dataTypeKey, dataTypeValue)];

              if (dataTypeValue === NormalizedDataType.Any) {
                menuItems.push(getMenuItemForDataType(arrayType, arrayType));
              }

              return menuItems;
            })}
          </MenuList>
        </MenuPopover>
      </Menu>
    </>
  );

  return (
    <span style={{ position: 'sticky', top: 0, zIndex: 2 }}>
      <Input
        value={searchTerm}
        onChange={(_e, data) => setSearchValue(data.value ?? '')}
        placeholder={searchLoc}
        className={styles.searchbar}
        size="small"
        contentAfter={searchbarInteractions}
      />
    </span>
  );
};
