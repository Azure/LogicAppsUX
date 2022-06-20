import type { Schema } from '../../models';
import { SelectSchemaCard } from './selectSchemaCard';
import { ChoiceGroup, DefaultButton, Dropdown, initializeIcons, Panel, PrimaryButton, TextField } from '@fluentui/react';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

export enum SchemaTypes {
  Input = 'input',
  Output = 'output',
}

export enum UploadSchemaTypes {
  UploadNew = 'upload-new',
  SelectFrom = 'select-from',
}

export interface AddSchemaModelProps {
  schemaType: SchemaTypes;
  onSubmitSchema: (schema: Schema) => void;
  schemaFilesList: Schema[];
}

const uploadSchemaOptions: IChoiceGroupOption[] = [
  // { key: UploadSchemaTypes.UploadNew, text: 'Upload new' },  // TODO: enable this when funtionality will be developed (14772529)
  { key: UploadSchemaTypes.SelectFrom, text: 'Select from existing' },
];

initializeIcons();

export const AddSchemaPanelButton: FunctionComponent<AddSchemaModelProps> = ({ schemaType, onSubmitSchema, schemaFilesList }) => {
  const [isPanelOpen, { setTrue: showPanel, setFalse: hidePanel }] = useBoolean(false);
  const [uploadType, setUploadType] = useState<string>(UploadSchemaTypes.SelectFrom);
  const [selectedSchema, setSelectedSchema] = useState<IDropdownOption>();
  const [errorMessage, setErrorMessage] = useState('');

  const dataMapDropdownOptions = schemaFilesList.map((file: Schema) => ({ key: file.name, text: file.name, data: file }));

  const intl = useIntl();

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
  const genericErrMsg = intl.formatMessage({
    defaultMessage: 'Failed loading the schema. Please try again.',
    description: 'error message for loading the schema',
  });

  let addSchemaHeaderText = '',
    uploadSelectLabelMessage = '',
    selectSchemaPlaceholderMessage = '';
  switch (schemaType) {
    case SchemaTypes.Input:
      addSchemaHeaderText = intl.formatMessage({
        defaultMessage: 'Add input schema',
        description: 'header text to inform this panel is for adding input schema',
      });
      uploadSelectLabelMessage = intl.formatMessage({
        defaultMessage: 'Upload or select an input schema to be used for your map.',
        description: 'label to inform to upload or select input schema to be used',
      });
      selectSchemaPlaceholderMessage = intl.formatMessage({
        defaultMessage: 'select input',
        description: 'placeholder for selecting the input schema dropdown',
      });
      break;
    case SchemaTypes.Output:
      addSchemaHeaderText = intl.formatMessage({
        defaultMessage: 'Add output schema',
        description: 'header text to inform this panel is for adding output schema',
      });
      uploadSelectLabelMessage = intl.formatMessage({
        defaultMessage: 'Upload or select an output schema to be used for your map.',
        description: 'label to inform to upload or select output schema to be used',
      });
      selectSchemaPlaceholderMessage = intl.formatMessage({
        defaultMessage: 'select output',
        description: 'placeholder for selecting the output schema dropdown',
      });
      break;
    default:
      break;
  }

  const onSelectedItemChange = useCallback((_: unknown, item?: IDropdownOption): void => {
    setSelectedSchema(item);
  }, []);

  const onUploadTypeChange = useCallback((_: unknown, option?: IChoiceGroupOption): void => {
    if (option) {
      setUploadType(option.key);
    }
  }, []);

  const onSchemaAddClick = useCallback(() => {
    setErrorMessage('');
    if (selectedSchema) {
      onSubmitSchema(selectedSchema.data);
      hidePanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [hidePanel, onSubmitSchema, selectedSchema, genericErrMsg]);

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        <PrimaryButton onClick={onSchemaAddClick} disabled={!selectedSchema} styles={{ root: { marginRight: 8 } }}>
          {addMessage}
        </PrimaryButton>
        <DefaultButton onClick={hidePanel}>{cancelMessage}</DefaultButton>
      </div>
    ),
    [hidePanel, selectedSchema, addMessage, cancelMessage, onSchemaAddClick]
  );

  return (
    <div>
      <SelectSchemaCard schemaType={schemaType} onClick={showPanel} />
      <Panel
        className="add-schema-panel"
        isLightDismiss
        isOpen={isPanelOpen}
        onDismiss={hidePanel}
        headerText={addSchemaHeaderText}
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

        {uploadType === UploadSchemaTypes.UploadNew && (
          <div className="upload-new">
            <TextField placeholder={uploadMessage} />
            <PrimaryButton text="Browse" style={{ marginLeft: 8 }}>
              {browseMessage}
            </PrimaryButton>
          </div>
        )}

        {uploadType === UploadSchemaTypes.SelectFrom && (
          <Dropdown
            selectedKey={selectedSchema ? selectedSchema.key : undefined}
            placeholder={selectSchemaPlaceholderMessage}
            options={dataMapDropdownOptions}
            onChange={onSelectedItemChange}
            errorMessage={errorMessage}
          />
        )}
      </Panel>
    </div>
  );
};
