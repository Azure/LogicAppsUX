import { Button, Input, makeStyles, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tooltip } from '@fluentui/react-components';
import { useDebouncedCallback } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Dismiss20Regular, Filter20Regular } from '@fluentui/react-icons';
import { NormalizedDataType } from '../../models';

const searchDebounceDelay = 300;

const useStyles = makeStyles({
  searchbar: {
    width: '100%',
    marginBottom: '6px',
  },
});

interface TreeHeaderProps {
  onSearch: (searchTerm: string) => void;
  onClear: () => void;
}

export const TreeHeader = ({ onSearch, onClear }: TreeHeaderProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dataTypeFilters, setDataTypeFilters] = useState<NormalizedDataType[]>([]);

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

  const searchbarInteractions: JSX.Element = (
    <>
      {searchTerm &&
        <Tooltip content={clearLoc} relationship='description'>
          <Button icon={<Dismiss20Regular />} appearance="subtle" onClick={clearSearch} aria-label={clearLoc} size='small' />
        </Tooltip>
      }

      <Menu>
        <MenuTrigger>
          <Tooltip content={filterLoc} relationship='description'>
            <Button icon={<Filter20Regular />} appearance="subtle" aria-label={filterLoc} size='small' />
          </Tooltip>
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            <MenuItem>Select all</MenuItem>
            {Object.keys(NormalizedDataType).map((dataType) => <MenuItem key={dataType}>{dataType}</MenuItem>)}
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
        size='small'
        contentAfter={searchbarInteractions}
      />
    </span>
  );
};
