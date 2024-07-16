import { DropdownTree } from '../common/DropdownTree';
import type { ITreeFile, IFileSysTreeItem, DataMapSchema } from '@microsoft/logic-apps-shared';
import { SchemaType, equals } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from '../../models/Schema';
import type { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import { DataMapperFileService, getSelectedSchema } from '../../core';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { convertSchemaToSchemaExtended } from '../../utils';
import { setInitialSchema } from '../../core/state/DataMapSlice';

export type SelectExistingSchemaProps = {
  schemaType: SchemaType;
  errorMessage: string;
  setSelectedSchema: (item: SchemaFile) => void;
};

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

export const SelectExistingSchema = (props: SelectExistingSchemaProps) => {
  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);
  const fileService = DataMapperFileService();
  const [selectedSchemaItem, updateSelectedSchemaItem] = useState<IFileSysTreeItem | undefined>(undefined);

  const dispatch = useDispatch();

  const onSubmitSchema = useCallback(
    (schema: DataMapSchema) => {
      if (props.schemaType) {
        const extendedSchema = convertSchemaToSchemaExtended(schema);
        dispatch(setInitialSchema({ schema: extendedSchema, schemaType: props.schemaType }));
      }
    },
    [dispatch, props.schemaType]
  );

  useQuery(
    [selectedSchemaItem],
    async () => {
      if (selectedSchemaItem) {
        if (selectedSchemaItem.type === 'file') {
          const schema = await getSelectedSchema(selectedSchemaItem.name, selectedSchemaItem.fullPath);
          onSubmitSchema(schema);
        }
      }
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedSchemaItem !== undefined,
    }
  );

  return (
    <DropdownTree
      items={availableSchemaList}
      onItemSelect={(item: IFileSysTreeItem) => {
        if (item.type === 'file') {
          updateSelectedSchemaItem(item);
        }
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
