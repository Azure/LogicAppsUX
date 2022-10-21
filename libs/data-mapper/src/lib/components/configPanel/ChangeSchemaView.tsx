import type { RootState } from '../../core/state/Store';
import { SchemaTypes } from '../../models';
import { PrimaryButton, Stack, TextField, ChoiceGroup, Dropdown, MessageBar, MessageBarType } from '@fluentui/react';
import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
import React, { useCallback, useRef } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

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
  name: string;
  path: string;
  type: SchemaTypes;
}

export interface SchemaInfo {
  name: string;
}

export interface ChangeSchemaViewProps {
  schemaType?: SchemaTypes;
  selectedSchema?: IDropdownOption;
  selectedSchemaFile?: SchemaFile;
  setSelectedSchema: (item: IDropdownOption<any> | undefined) => void;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
  uploadType: UploadSchemaTypes;
  setUploadType: (newUploadType: UploadSchemaTypes) => void;
}

export const ChangeSchemaView: FunctionComponent<ChangeSchemaViewProps> = ({
  schemaType,
  selectedSchema,
  selectedSchemaFile,
  setSelectedSchema,
  setSelectedSchemaFile,
  errorMessage,
  uploadType,
  setUploadType,
}) => {
  const intl = useIntl();
  const schemaFileInputRef = useRef<HTMLInputElement>(null);
  const schemaList = useSelector((state: RootState) => {
    return state.schema.availableSchemas;
  });

  const dataMapDropdownOptions = schemaList?.map((file: string) => ({ key: file, text: file } ?? []));

  const replaceSchemaWarningLoc = intl.formatMessage({
    defaultMessage: 'Replacing an existing schema with an incompatible schema might create errors in your map.',
    description: 'Message bar warning about replacing existing schema',
  });

  const uploadMessage = intl.formatMessage({
    defaultMessage: 'Select a file to upload',
    description: 'Placeholder for input to load a schema file',
  });
  const dropdownAriaLabel = intl.formatMessage({
    defaultMessage: 'Select the schema for dropdown',
    description: 'Dropdown for selecting or changing the input or target schema ',
  });
  const browseLoc = intl.formatMessage({
    defaultMessage: 'Browse',
    description: 'Browse for file',
  });

  let uploadSelectLabelMessage = '';
  let selectSchemaPlaceholderMessage = '';

  switch (schemaType) {
    case SchemaTypes.Source:
      uploadSelectLabelMessage = intl.formatMessage({
        defaultMessage: 'Add or select a source schema to use for your map.',
        description: 'label to inform to upload or select source schema to be used',
      });
      selectSchemaPlaceholderMessage = intl.formatMessage({
        defaultMessage: 'Select a source schema',
        description: 'placeholder for selecting the source schema dropdown',
      });
      break;
    case SchemaTypes.Target:
      uploadSelectLabelMessage = intl.formatMessage({
        defaultMessage: 'Add or select a target schema to use for your map.',
        description: 'label to inform to upload or select target schema to be used',
      });
      selectSchemaPlaceholderMessage = intl.formatMessage({
        defaultMessage: 'Select a target schema',
        description: 'placeholder for selecting the target schema dropdown',
      });
      break;
    default:
      break;
  }

  const addNewLoc = intl.formatMessage({
    defaultMessage: 'Add new',
    description: 'Add new option',
  });

  const selectExistingLoc = intl.formatMessage({
    defaultMessage: 'Select existing',
    description: 'Select existing option',
  });

  const uploadSchemaOptions: IChoiceGroupOption[] = [
    { key: UploadSchemaTypes.UploadNew, text: addNewLoc },
    { key: UploadSchemaTypes.SelectFrom, text: selectExistingLoc },
  ];

  const onSelectedItemChange = useCallback(
    (_: unknown, item?: IDropdownOption): void => {
      setSelectedSchema(item);
    },
    [setSelectedSchema]
  );

  const onUploadTypeChange = useCallback(
    (_: unknown, option?: IChoiceGroupOption): void => {
      if (option) {
        setUploadType(option.key as UploadSchemaTypes);
      }
    },
    [setUploadType]
  );

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
      setSelectedSchemaFile({ name: schemaFile.name, path: schemaFile.path, type: schemaType });
    }
  };

  return (
    <div>
      <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { marginTop: 20 } }}>
        {replaceSchemaWarningLoc}
      </MessageBar>

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
          <input type="file" ref={schemaFileInputRef} onInput={onSelectSchemaFile} accept=".xsd" hidden />
          <Stack horizontal>
            <TextField value={selectedSchemaFile?.name} placeholder={uploadMessage} readOnly />
            <PrimaryButton onClick={() => schemaFileInputRef.current?.click()} style={{ marginLeft: 8 }}>
              {browseLoc}
            </PrimaryButton>
          </Stack>
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
