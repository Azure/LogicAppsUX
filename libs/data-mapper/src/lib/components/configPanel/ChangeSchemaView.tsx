import { SchemaTypes } from '../../models/Schema';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import { ChoiceGroup, Dropdown, PrimaryButton, TextField } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export enum UploadSchemaTypes {
  UploadNew = 'upload-new',
  SelectFrom = 'select-from',
}

export interface ChangeSchemaView {
  schemaList: SchemaInfo[] | any;
  schemaType?: SchemaTypes;
  selectedSchema?: IDropdownOption;
  setSelectedSchema: (item: IDropdownOption<any> | undefined) => void;
  errorMessage: string;
}

export interface SchemaInfo {
  name: string;
  href: string;
}

const uploadSchemaOptions: IChoiceGroupOption[] = [
  // { key: UploadSchemaTypes.UploadNew, text: 'Upload new' },  // TODO: enable this when funtionality will be developed (14772529)
  { key: UploadSchemaTypes.SelectFrom, text: 'Select from existing' },
];

export const ChangeSchemaView: FunctionComponent<ChangeSchemaView> = ({
  schemaList,
  schemaType,
  selectedSchema,
  setSelectedSchema,
  errorMessage,
}) => {
  // const schemaFilesList = useSelector((state: RootState) => state.schema.availableSchemas);
  const [uploadType, setUploadType] = useState<string>(UploadSchemaTypes.SelectFrom);

  // const dataMapDropdownOptions = schemaFilesList?.map((file: Schema) => ({ key: file.name, text: file.name, data: file }));
  const dataMapDropdownOptions = schemaList?.map((file: SchemaInfo) => ({ key: file.name, text: file.name, href: file.href }));

  const intl = useIntl();

  const browseMessage = intl.formatMessage({
    defaultMessage: 'Browse',
    description: 'This is a button text where clicking will lead to browsing to select a file to upload',
  });
  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    description: 'This is shown as a placeholder text for selecting a file to upload',
  });
  const dropdownAriaLabel = intl.formatMessage({
    defaultMessage: 'Select the schema for dropdown',
    description: 'Dropdown for selecting or changing the input or output schema ',
  });

  let uploadSelectLabelMessage = '';
  let selectSchemaPlaceholderMessage = '';

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

  const onSelectedItemChange = useCallback(
    (_: unknown, item?: IDropdownOption): void => {
      setSelectedSchema(item);
    },
    [setSelectedSchema]
  );

  const onUploadTypeChange = useCallback((_: unknown, option?: IChoiceGroupOption): void => {
    if (option) {
      setUploadType(option.key);
    }
  }, []);

  return (
    <div>
      <p className="inform-text">{uploadSelectLabelMessage}</p>

      <ChoiceGroup
        className="choice-group"
        selectedKey={uploadType}
        options={uploadSchemaOptions}
        onChange={onUploadTypeChange}
        required={true}
      />

      {uploadType === UploadSchemaTypes.UploadNew && (
        <div className="upload-new">
          <TextField placeholder={uploadMessage} />
          <PrimaryButton className="panel-button-right" aria-label={browseMessage}>
            {browseMessage}
          </PrimaryButton>
        </div>
      )}

      {uploadType === UploadSchemaTypes.SelectFrom && (
        <Dropdown
          aria-label={dropdownAriaLabel}
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
