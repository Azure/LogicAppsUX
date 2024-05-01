import { DropdownTree } from '../common/DropdownTree';
import type { ITreeFile, ITreeItem } from 'models/Tree';
import { SchemaType, equals } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from './AddOrUpdateSchemaView';

const mockFileItems: ITreeItem[] = [
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
];

export type SelectExistingSchemaProps = {
  schemaType?: SchemaType;
  errorMessage: string;
  setSelectedSchema: (item: SchemaFile) => void;
};

export const SelectExistingSchema = (props: SelectExistingSchemaProps) => {
  return (
    <DropdownTree
      items={mockFileItems}
      onItemSelect={(item: ITreeItem) => {
        props.setSelectedSchema({
          name: item.name ?? '',
          path: equals(item.type, 'file') ? (item as ITreeFile).fullPath ?? '' : '',
          type: props.schemaType ?? SchemaType.Source,
        });
      }}
    />
  );
};
