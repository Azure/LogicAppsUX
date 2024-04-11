import type { RootState } from '../../core/state/Store';
import { FileDropdown } from '../fileDropdown/fileDropdown';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Dropdown, Tree, TreeItem, TreeItemLayout, Option, Combobox } from '@fluentui/react-components';
import { SearchBox } from '@fluentui/react';

export type SelectExistingSchemaProps = {
  errorMessage: string;
  schemaType?: SchemaType;
  setSelectedSchema: (item: string | undefined) => void;
};

type FileTreeItem = FileTreeDirectory | FileTreeFile;

interface FileTreeDirectory {
  name: string;
  type: 'directory';
  children: FileTreeItem[];
}

interface FileTreeFile {
  name: string;
  type: 'file';
  fullPath?: string;
}

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

  // intl
  const intl = useIntl();
  const folderLocationLabel = intl.formatMessage({
    defaultMessage: 'Existing schemas from',
    id: '2gOfQI',
    description: 'Schema dropdown aria label',
  });
  const dropdownAriaLabel = intl.formatMessage({
    defaultMessage: 'Select the schema for dropdown',
    id: 'c4GQZE',
    description: 'Schema dropdown aria label',
  });
  const schemaDropdownPlaceholder = useMemo(() => {
    if (props.schemaType === SchemaType.Source) {
      return intl.formatMessage({
        defaultMessage: 'Select a source schema',
        id: '3eeli7',
        description: 'Source schema dropdown placeholder',
      });
    } else {
      return intl.formatMessage({
        defaultMessage: 'Select a target schema',
        id: 'XkBxv5',
        description: 'Target schema dropdown placeholder',
      });
    }
  }, [intl, props.schemaType]);

  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);

  const dataMapDropdownOptions = useMemo(() => availableSchemaList ?? [], [availableSchemaList]);

  const setSelectedSchema = props.setSelectedSchema;

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
    //   <>      <Option checkIcon={<div></div>} text="mono" onClick={onSelect}>
    //   <Tree>{fileTree(mockFileTree)}</Tree>
    // </Option>
    //   <Combobox selectedOptions={selectedFileOption} defaultValue={selectedFileName} id="dropdown" style={{ width: '200px' }} open={true}>
    //     <Option checkIcon={<div></div>} text="mono" onClick={onSelect}>
    //       <Tree>{fileTree(mockFileTree)}</Tree>
    //     </Option>
    //   </Combobox>
    //   </>
    <>
      <SearchBox></SearchBox>
      <Tree>{fileTree(mockFileTree)}</Tree>
    </>
  );
};
