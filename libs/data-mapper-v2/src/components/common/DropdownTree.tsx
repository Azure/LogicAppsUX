import { Tree, TreeItem, TreeItemLayout, Text } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react';
import { ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import type { ITreeItem } from 'models/Tree';
import useStyles from './styles';
import { useState, useMemo, useCallback } from 'react';
import { isEmptyString } from '@microsoft/logic-apps-shared';

interface DropdownTreeProps {
  items: ITreeItem[];
  onItemSelect: (item: ITreeItem) => void;
}

export const DropdownTree = (props: DropdownTreeProps) => {
  const [showDropdownTree, setShowDropdownTree] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const intl = useIntl();
  const styles = useStyles();

  const selectSchema = intl.formatMessage({
    defaultMessage: 'Select schema',
    id: '3pheF6',
    description: 'Select schema',
  });

  const search = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'toWTrl',
    description: 'Search from file list',
  });

  const onFileNameSelect = (item: ITreeItem) => {
    props.onItemSelect(item);
    setShowDropdownTree(false);
    console.log(item.name);
  };

  const filterDropdownItem = useCallback((item: ITreeItem, value: string): ITreeItem | undefined => {
    if (isEmptyString(value) || item.name.includes(value)) {
      return item;
    }

    if (item.type === 'directory') {
      const children = item.children.map((child) => filterDropdownItem(child, value)).filter((child) => child !== undefined) as ITreeItem[];

      if (children.length === 0) {
        return undefined;
      }
      return {
        ...item,
        children: children,
      };
    }

    return undefined;
  }, []);

  const filteredItems = useMemo(
    () => props.items.map((item) => filterDropdownItem(item, searchValue)).filter((item) => item !== undefined) as ITreeItem[],
    [props.items, searchValue, filterDropdownItem]
  );

  const displayTree = (item: ITreeItem): JSX.Element => {
    if (item.type === 'directory') {
      const childElements = item.children.map((child: ITreeItem) => displayTree(child));
      return (
        <TreeItem itemType="branch">
          <TreeItemLayout>{item.name}</TreeItemLayout>
          <Tree>{childElements}</Tree>
        </TreeItem>
      );
    }
    return (
      <TreeItem key={item.fullPath} value={item.fullPath} onClick={(_) => onFileNameSelect(item)} itemType="leaf">
        <TreeItemLayout>{item.name}</TreeItemLayout>
      </TreeItem>
    );
  };

  const onSearchValueChange = (_event?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchValue(newValue ?? '');
  };

  return (
    <div className={styles.componentWrapper}>
      <div
        className={styles.dropdownInputWrapper}
        onClick={() => {
          setShowDropdownTree(!showDropdownTree);
        }}
      >
        <Text className={styles.dropdownInput} defaultValue={selectSchema}>
          {selectSchema}
        </Text>
        {showDropdownTree ? (
          <ChevronDownRegular className={styles.dropdownChevronIcon} />
        ) : (
          <ChevronRightRegular className={styles.dropdownChevronIcon} />
        )}
      </div>
      {showDropdownTree && (
        <div className={styles.dropdownInputValue}>
          <SearchBox placeholder={search} onChange={onSearchValueChange} />
          <Tree className={styles.treeWrapper} aria-label="tree">
            {filteredItems.map((item: ITreeItem, index: number) => (
              <span key={`tree-${index}`}>{displayTree(item)}</span>
            ))}
          </Tree>
        </div>
      )}
    </div>
  );
};
