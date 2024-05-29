import { DropdownTree } from '../common/DropdownTree';
import type { ITreeFile, IFileSysTreeItem } from 'models/Tree';
import { SchemaType, equals } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from './AddOrUpdateSchemaView';
import { RootState } from '../../core/state/Store';
import { useSelector } from 'react-redux';

const mockFileItems: IFileSysTreeItem[] = [
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
  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);
  return (
    <DropdownTree
      items={mockFileItems}
      onItemSelect={(item: IFileSysTreeItem) => {
        props.setSelectedSchema({
          name: item.name ?? '',
          path: equals(item.type, 'file') ? (item as ITreeFile).fullPath ?? '' : '',
          type: props.schemaType ?? SchemaType.Source,
        });
      }}
    />
  );
};
