import { DropdownTree } from '../common/DropdownTree';
import type { ITreeFile, IFileSysTreeItem } from 'models/Tree';
import { SchemaType, equals } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from './AddOrUpdateSchemaView';
import type { RootState } from '../../core/state/Store';
import { useSelector } from 'react-redux';
import { DataMapperFileService } from '../../core';

export type SelectExistingSchemaProps = {
  schemaType?: SchemaType;
  errorMessage: string;
  setSelectedSchema: (item: SchemaFile) => void;
};

export const SelectExistingSchema = (props: SelectExistingSchemaProps) => {
  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);
  const fileService = DataMapperFileService();

  return (
    <DropdownTree
      items={availableSchemaList}
      onItemSelect={(item: IFileSysTreeItem) => {
        props.setSelectedSchema({
          name: item.name ?? '',
          path: equals(item.type, 'file') ? (item as ITreeFile).fullPath ?? '' : '',
          type: props.schemaType ?? SchemaType.Source,
        });
      }}
      onDropdownOpenClose={fileService.readCurrentSchemaOptions ? fileService.readCurrentSchemaOptions : () => null}
    />
  );
};
