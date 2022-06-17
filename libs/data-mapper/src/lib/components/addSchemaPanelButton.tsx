import type { Schema } from '../models';
import { SelectSchemaCard } from './selectSchemaCard';
import { ChoiceGroup, DefaultButton, Dropdown, initializeIcons, Panel, PrimaryButton, TextField } from '@fluentui/react';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';

export enum SchemaTypes {
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum UploadSchemaTypes {
  UPLOAD_NEW = 'upload-new',
  SELECT_FROM = 'select-from',
}

export interface AddSchemaModelProps {
  schemaType: SchemaTypes;
  onSubmitSchema: (schema: Schema) => void;
  schemaFilesList: Schema[];
}

const uploadSchemaOptions: IChoiceGroupOption[] = [
  { key: UploadSchemaTypes.UPLOAD_NEW, text: 'Upload new' },
  { key: UploadSchemaTypes.SELECT_FROM, text: 'Select from existing' },
];

initializeIcons();

export const AddSchemaPanelButton: FunctionComponent<AddSchemaModelProps> = ({ schemaType, onSubmitSchema, schemaFilesList }) => {
  const [isPanelOpen, { setTrue: showPanel, setFalse: hidePanel }] = useBoolean(false);
  const [uploadType, setUploadType] = useState<string>(UploadSchemaTypes.SELECT_FROM);
  const [selectedSchema, setSelectedSchema] = useState<IDropdownOption>();

  const dataMapDropdownOptions = schemaFilesList.map((file: Schema) => ({ key: file.name, text: file.name, data: file }));

  const onSelectedItemChange = useCallback((_: unknown, item?: IDropdownOption): void => {
    setSelectedSchema(item);
  }, []);

  const onUploadTypeChange = useCallback((_: unknown, option?: IChoiceGroupOption): void => {
    if (option) setUploadType(option.key);
  }, []);

  const onSchemaAddClick = () => {
    if (selectedSchema) onSubmitSchema(selectedSchema.data);
    hidePanel();
  };

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        <PrimaryButton onClick={onSchemaAddClick} disabled={!selectedSchema} styles={{ root: { marginRight: 8 } }}>
          Add
        </PrimaryButton>
        <DefaultButton onClick={hidePanel}>Cancel</DefaultButton>
      </div>
    ),
    [hidePanel, selectedSchema]
  );

  return (
    <div
      style={
        {
          // height: '100%',
          // background: 'yellow'
        }
      }
    >
      <SelectSchemaCard schemaType={schemaType} onClick={showPanel} />
      <Panel
        isLightDismiss
        isOpen={isPanelOpen}
        onDismiss={hidePanel}
        headerText={`Add ${schemaType} schema`}
        closeButtonAriaLabel="Close"
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <p>{`Upload or select an ${schemaType} schema to be used for your map.`}</p>

        <ChoiceGroup
          selectedKey={uploadType}
          options={uploadSchemaOptions}
          onChange={onUploadTypeChange}
          required={true}
          style={{ marginBottom: 16 }}
        />

        {uploadType === UploadSchemaTypes.UPLOAD_NEW && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <TextField placeholder="Select a file to upload" />
            <PrimaryButton text="Browse" style={{ marginLeft: 8 }} />
          </div>
        )}

        {uploadType === UploadSchemaTypes.SELECT_FROM && (
          <Dropdown
            selectedKey={selectedSchema ? selectedSchema.key : undefined}
            placeholder={`select ${schemaType}`}
            options={dataMapDropdownOptions}
            onChange={onSelectedItemChange}
          />
        )}
      </Panel>
    </div>
  );
};
