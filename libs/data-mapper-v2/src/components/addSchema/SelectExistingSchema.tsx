/* eslint-disable @typescript-eslint/no-unused-vars */
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Tree, TreeItem, TreeItemLayout } from '@fluentui/react-components';

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
    }
    return intl.formatMessage({
      defaultMessage: 'Select a target schema',
      id: 'XkBxv5',
      description: 'Target schema dropdown placeholder',
    });
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
    }
    return (
      <TreeItem itemType="leaf">
        <TreeItemLayout>{item.name}</TreeItemLayout>
      </TreeItem>
    );
  };

  return <Tree>{fileTree(mockFileTree)}</Tree>;
};
