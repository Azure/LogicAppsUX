import type { Schema } from '../../models';
import { ChoiceGroup, Dropdown, initializeIcons, PrimaryButton, TextField } from '@fluentui/react';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
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

export interface ChangeSchemaView {
  schemaType?: SchemaTypes;
  selectedSchema?: IDropdownOption;
  setSelectedSchema: (item: IDropdownOption<any> | undefined) => void;
  schemaFilesList?: Schema[];
  errorMessage: string;
}

const uploadSchemaOptions: IChoiceGroupOption[] = [
  // { key: UploadSchemaTypes.UploadNew, text: 'Upload new' },  // TODO: enable this when funtionality will be developed (14772529)
  { key: UploadSchemaTypes.SelectFrom, text: 'Select from existing' },
];

initializeIcons();

export const ChangeSchemaView: FunctionComponent<ChangeSchemaView> = ({
  schemaType,
  selectedSchema,
  setSelectedSchema,
  schemaFilesList,
  errorMessage,
}) => {
  const [uploadType, setUploadType] = useState<string>(UploadSchemaTypes.SelectFrom);

  const dataMapDropdownOptions = schemaFilesList?.map((file: Schema) => ({ key: file.name, text: file.name, data: file }));

  const intl = useIntl();

  const browseMessage = intl.formatMessage({
    defaultMessage: 'Browse',
    description: 'This is a button text where clicking will lead to browsing to select a file to upload',
  });
  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    description: 'This is shown as a placeholder text for selecting a file to upload',
  });

  let uploadSelectLabelMessage = '',
    selectSchemaPlaceholderMessage = '';
  switch (schemaType) {
    case SchemaTypes.Input:
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

  return (
    <div>
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
          options={dataMapDropdownOptions ?? []}
          onChange={onSelectedItemChange}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
};
