import type { Schema } from '../../models';
import { SelectSchemaCard } from './selectSchemaCard';
import { ChoiceGroup, DefaultButton, Dropdown, initializeIcons, Panel, PrimaryButton, TextField } from '@fluentui/react';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

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

  const intl = useIntl();

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

  const addMessage = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Button text for Add to add the selected schema file to use',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button text for Cancel to cancel the schema selection.',
  });
  const browseMessage = intl.formatMessage({
    defaultMessage: 'Browse',
    description: 'This is a button text where clicking will lead to browsing to select a file to upload',
  });
  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    description: 'This is shown as a placeholder text for selecting a file to upload',
  });
  const uploadSelectLabelMessage = intl.formatMessage(
    {
      defaultMessage: 'Upload or select an {schemaType} schema to be used for your map.',
      description: 'label to inform to upload or select schema to be used',
    },
    { schemaType: schemaType }
  );
  const selectSchemaPlaceholderMessage = intl.formatMessage(
    {
      defaultMessage: 'select {schemaType}',
      description: 'placeholder for selecting the schema dropdown',
    },
    { schemaType: schemaType }
  );

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        <PrimaryButton onClick={onSchemaAddClick} disabled={!selectedSchema} styles={{ root: { marginRight: 8 } }}>
          {addMessage}
        </PrimaryButton>
        <DefaultButton onClick={hidePanel}>{cancelMessage}</DefaultButton>
      </div>
    ),
    [hidePanel, selectedSchema]
  );

  return (
    <div>
      <SelectSchemaCard schemaType={schemaType} onClick={showPanel} />
      <Panel
        className="add-schema-panel"
        isLightDismiss
        isOpen={isPanelOpen}
        onDismiss={hidePanel}
        headerText={`Add ${schemaType} schema`}
        closeButtonAriaLabel="Close"
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <p>{uploadSelectLabelMessage}</p>

        <ChoiceGroup
          selectedKey={uploadType}
          options={uploadSchemaOptions}
          onChange={onUploadTypeChange}
          required={true}
          style={{ marginBottom: 16 }}
        />

        {uploadType === UploadSchemaTypes.UPLOAD_NEW && (
          <div className="upload-new">
            <TextField placeholder={uploadMessage} />
            <PrimaryButton text="Browse" style={{ marginLeft: 8 }}>
              {browseMessage}
            </PrimaryButton>
          </div>
        )}

        {uploadType === UploadSchemaTypes.SELECT_FROM && (
          <Dropdown
            selectedKey={selectedSchema ? selectedSchema.key : undefined}
            placeholder={selectSchemaPlaceholderMessage}
            options={dataMapDropdownOptions}
            onChange={onSelectedItemChange}
          />
        )}
      </Panel>
    </div>
  );
};
