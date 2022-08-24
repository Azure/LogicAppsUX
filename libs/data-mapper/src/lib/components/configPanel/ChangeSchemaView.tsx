import { SchemaTypes } from '../../models/Schema';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import { ChoiceGroup, Dropdown } from '@fluentui/react';
import { Label } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import React, { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

export enum UploadSchemaTypes {
  UploadNew = 'upload-new',
  SelectFrom = 'select-from',
}

export interface ChangeSchemaView {
  schemaList: SchemaInfo[] | any;
}
export interface FileWithVsCodePath extends File {
  path?: string;
}
export interface SchemaFile {
  path: string;
  type: SchemaTypes;
}

export interface ChangeSchemaViewProps {
  schemaType?: SchemaTypes;
  selectedSchema?: IDropdownOption;
  selectedSchemaFile?: IDropdownOption;
  setSelectedSchema: (item: IDropdownOption<any> | undefined) => void;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
}

export interface SchemaInfo {
  name: string;
  href: string;
}

const uploadSchemaOptions: IChoiceGroupOption[] = [
  { key: UploadSchemaTypes.UploadNew, text: 'Upload new' },
  { key: UploadSchemaTypes.SelectFrom, text: 'Select from existing' },
];

export const ChangeSchemaView: FunctionComponent<ChangeSchemaViewProps & ChangeSchemaView> = ({
  schemaList,
  schemaType,
  selectedSchema,
  setSelectedSchema,
  setSelectedSchemaFile,
  errorMessage,
}) => {
  const [uploadType, setUploadType] = useState<string>(UploadSchemaTypes.SelectFrom);

  const dataMapDropdownOptions = schemaList?.map((file: SchemaInfo) => ({ key: file.name, text: file.name, href: file.href }));

  const intl = useIntl();

  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a schema file to load',
    description: 'Placeholder for dropdown to load a schema file into memory',
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
        defaultMessage: 'Select an input schema',
        description: 'placeholder for selecting the input schema dropdown',
      });
      break;
    case SchemaTypes.Output:
      uploadSelectLabelMessage = intl.formatMessage({
        defaultMessage: 'Upload or select an output schema to be used for your map.',
        description: 'label to inform to upload or select output schema to be used',
      });
      selectSchemaPlaceholderMessage = intl.formatMessage({
        defaultMessage: 'Select an output schema',
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

  const onSelectSchemaFile = (event: React.FormEvent<HTMLInputElement>) => {
    if (!event?.currentTarget?.files) {
      console.error('Files array is empty');
      return;
    }

    const schemaFile = event.currentTarget.files[0] as FileWithVsCodePath;
    if (!schemaFile.path) {
      console.log('Path property is missing from file (should only occur in browser/standalone)');
    } else if (!schemaType) {
      console.error('Missing schemaType');
    } else {
      setSelectedSchemaFile({ path: schemaFile.path, type: schemaType });
    }
  };

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
        <div>
          <Label>
            {uploadMessage}
            <input id="schema-file-upload" type="file" onInput={onSelectSchemaFile} accept=".json" />
          </Label>
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
