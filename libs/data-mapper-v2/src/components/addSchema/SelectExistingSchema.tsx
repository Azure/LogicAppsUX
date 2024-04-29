import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react';
import useStyles from './styles';
import { FileTreeDirectory, FileTreeItem, SelectExistingSchemaProps } from './models';

const mockFileTree: FileTreeDirectory = {
  name: 'Parent',
  type: 'directory',
  children: [
    {
      name: 'Child1.xsd',
      type: 'file',
      fullPath: '/Artifacts/Schemas/Child1.xsd',
    },
    {
      name: 'Folder',
      type: 'directory',
      children: [
        {
          name: 'Abc.json',
          type: 'file',
          fullPath: '/Artifacts/Schemas/Folder/Abc.json',
        },
      ],
    },
    {
      name: 'sourceSchema.json',
      type: 'file',
      fullPath: '/Artifacts/Schemas/sourceSchema.json',
    },
  ],
};

export const SelectExistingSchema = (props: SelectExistingSchemaProps) => {
  const schemaRelativePath = '/Artifacts/Schemas';
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileOption, setSelectedFileOption] = useState<string[]>([]);

  const styles = useStyles();

  // intl
  const intl = useIntl();
  const search = intl.formatMessage({
    defaultMessage: 'Search',
    id: '2gOfQ3j',
    description: 'Search from file list',
  });

  const fileTree = (item: FileTreeItem): JSX.Element => {
    if (item.type === 'directory') {
      const childElements = item.children.map((child) => fileTree(child));
      return (
        <TreeItem itemType="branch">
          <TreeItemLayout>{item.name}</TreeItemLayout>
          <Tree>{childElements}</Tree>
        </TreeItem>
      );
    } else {
      return (
        <TreeItem key={item.fullPath} value={item.fullPath} onClick={onFileNameSelect} itemType="leaf">
          <TreeItemLayout>{item.name}</TreeItemLayout>
        </TreeItem>
      );
    }
  };

  const onFileNameSelect: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const value = e.currentTarget.getAttribute('data-fui-tree-item-value');
    setSelectedFileName(value ?? '');
    const opt = selectedFileOption;
    opt.push(value ?? '');
    setSelectedFileOption(opt);
  };

  const onSelect: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const onHover: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  return (
    <>
      <SearchBox placeholder={search} />
      <Tree className={styles.treeWrapper}>{fileTree(mockFileTree)}</Tree>
    </>
  );
};
