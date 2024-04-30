import DropdownTree from 'components/common/DropdownTree';
import type { ITreeItem } from 'models/Tree';
import type { SchemaType } from '@microsoft/logic-apps-shared';

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
  errorMessage: string;
  schemaType?: SchemaType;
  setSelectedSchema: (item: string | undefined) => void;
};

export const SelectExistingSchema = (_props: SelectExistingSchemaProps) => {
  return <DropdownTree items={mockFileItems} />;
};
