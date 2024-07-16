import { Tree, TreeItem, TreeItemLayout, Text, mergeClasses } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react';
import { ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import useStyles from './styles';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { isEmptyString } from '@microsoft/logic-apps-shared';

interface DropdownTreeProps {
  items: IFileSysTreeItem[];
  onItemSelect: (item: IFileSysTreeItem) => void;
  onDropdownOpenClose: () => void;
  className?: string;
}

export const DropdownTree = ({ items, onItemSelect, onDropdownOpenClose, className }: DropdownTreeProps) => {
  const [showDropdownTree, setShowDropdownTree] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const intl = useIntl();
  const styles = useStyles();

  useEffect(() => {
    // update items when the tree is closed and reopened
    onDropdownOpenClose();
  }, [showDropdownTree, onDropdownOpenClose]);

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

  const onFileNameSelect = (item: IFileSysTreeItem) => {
    onItemSelect(item);
    setShowDropdownTree(false);
    console.log(item.name);
  };

  const filterDropdownItem = useCallback((item: IFileSysTreeItem, value: string): IFileSysTreeItem | undefined => {
    if (isEmptyString(value) || item.name.includes(value)) {
      return item;
    }

    if (item.type === 'directory') {
      const children = item.children
        .map((child) => filterDropdownItem(child, value))
        .filter((child) => child !== undefined) as IFileSysTreeItem[];

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
    () => items.map((item) => filterDropdownItem(item, searchValue)).filter((item) => item !== undefined) as IFileSysTreeItem[],
    [items, searchValue, filterDropdownItem]
  );

  const displayTree = (item: IFileSysTreeItem): JSX.Element => {
    if (item.type === 'directory') {
      const childElements = item.children.map((child: IFileSysTreeItem) => displayTree(child));
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
    <div className={mergeClasses(styles.componentWrapper, className ?? '')}>
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
            {filteredItems.map((item: IFileSysTreeItem, index: number) => (
              <span key={`tree-${index}`}>{displayTree(item)}</span>
            ))}
          </Tree>
        </div>
      )}
    </div>
  );
};
