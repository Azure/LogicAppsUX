import { Tree, TreeItem, TreeItemLayout, Input } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react';
import { ChevronRightRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import type { ITreeItem } from 'models/Tree';
import useStyles from './styles';

interface DropdownTreeProps {
  items: ITreeItem[];
}

export const DropdownTree = (props: DropdownTreeProps) => {
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

  const onFileNameSelect: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const value = e.currentTarget.getAttribute('data-fui-tree-item-value');
    console.log(value);
  };

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
      <TreeItem key={item.fullPath} value={item.fullPath} onClick={onFileNameSelect} itemType="leaf">
        <TreeItemLayout>{item.name}</TreeItemLayout>
      </TreeItem>
    );
  };

  return (
    <>
      <Input size="small" placeholder={selectSchema} contentAfter={<ChevronRightRegular />} disabled={true} />
      <SearchBox placeholder={search} />
      <Tree className={styles.treeWrapper}>{props.items.map((item) => displayTree(item))}</Tree>
    </>
  );
};

export default DropdownTree;
