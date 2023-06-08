import { ConfigPanelView } from '../../core/state/PanelSlice';
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '../../models';
import { getFileNameAndPath } from '../../utils';
import { PrimaryButton, Stack, TextField, ChoiceGroup, MessageBar, MessageBarType } from '@fluentui/react';
import type { IChoiceGroupOption, IStackTokens } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { makeStyles, shorthands, tokens, Combobox, Option, Text } from '@fluentui/react-components';
import React, { useCallback, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const acceptedSchemaFileInputExtensions = '.xsd';

const useStyles = makeStyles({
  option: {
    ...shorthands.borderBottom('.5px', 'solid', tokens.colorNeutralStroke1),
  },
  combobox: {
    ...shorthands.border('0.8px', 'solid', '#d1d1d1'),

    ...shorthands.outline('0px'),
    paddingRight: '10px',
    width: '290px',
  },
});

export enum UploadSchemaTypes {
  UploadNew = 'upload-new',
  SelectFrom = 'select-from',
}

export interface FileWithVsCodePath extends File {
  path?: string;
}
export interface SchemaFile {
  name: string;
  path: string;
  type: SchemaType;
}

export interface AddOrUpdateSchemaViewProps {
  schemaType?: SchemaType;
  selectedSchema?: string;
  selectedSchemaFile?: SchemaFile;
  setSelectedSchema: (item: string | undefined) => void;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
  uploadType: UploadSchemaTypes;
  setUploadType: (newUploadType: UploadSchemaTypes) => void;
}

export const AddOrUpdateSchemaView = ({
  schemaType,
  selectedSchemaFile,
  setSelectedSchema,
  setSelectedSchemaFile,
  errorMessage,
  uploadType,
  setUploadType,
}: AddOrUpdateSchemaViewProps) => {
  const intl = useIntl();
  const schemaFileInputRef = useRef<HTMLInputElement>(null);
  const { sourceSchema: curSourceSchema, targetSchema: curTargetSchema } = useSelector(
    (state: RootState) => state.dataMap.curDataMapOperation
  );
  const currentPanelView = useSelector((state: RootState) => state.panel.currentPanelView);
  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);

  const styles = useStyles();

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
    description: 'Schema dropdown aria label',
  });

  const browseLoc = intl.formatMessage({
    defaultMessage: 'Browse',
    description: 'Browse for file',
  });

  const addNewLoc = intl.formatMessage({
    defaultMessage: 'Add new',
    description: 'Add new option',
  });

  const selectExistingLoc = intl.formatMessage({
    defaultMessage: 'Select existing',
    description: 'Select existing option',
  });

  const updateSourceSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Update source schema',
    description: 'Header to update source schema',
  });

  const updateTargetSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Update target schema',
    description: 'Header to update target schema',
  });

  const [addOrSelectSchemaMsg, schemaDropdownPlaceholder] = useMemo(() => {
    if (schemaType === SchemaType.Source) {
      return [
        intl.formatMessage({
          defaultMessage: 'Add or select a source schema to use for your map.',
          description: 'label to inform to upload or select source schema to be used',
        }),
        intl.formatMessage({
          defaultMessage: 'Select a source schema',
          description: 'Source schema dropdown placeholder',
        }),
      ];
    } else {
      return [
        intl.formatMessage({
          defaultMessage: 'Add or select a target schema to use for your map.',
          description: 'label to inform to upload or select target schema to be used',
        }),
        intl.formatMessage({
          defaultMessage: 'Select a target schema',
          description: 'Target schema dropdown placeholder',
        }),
      ];
    }
  }, [intl, schemaType]);

  const onSelectOption = useCallback(
    (option?: string) => {
      setSelectedSchema(option);
    },
    [setSelectedSchema]
  );

  const onChangeUploadType = useCallback(
    (option?: IChoiceGroupOption) => {
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

  const uploadSchemaOptions: IChoiceGroupOption[] = useMemo(
    () => [
      { key: UploadSchemaTypes.UploadNew, text: addNewLoc },
      { key: UploadSchemaTypes.SelectFrom, text: selectExistingLoc },
    ],
    [addNewLoc, selectExistingLoc]
  );

  const dataMapDropdownOptions = useMemo(() => availableSchemaList ?? [], [availableSchemaList]);

  const [matchingOptions, setMatchingOptions] = React.useState([...dataMapDropdownOptions]);

  const isOverwritingSchema = useMemo(
    () => (schemaType === SchemaType.Source ? !!curSourceSchema : !!curTargetSchema),
    [schemaType, curSourceSchema, curTargetSchema]
  );

  const updateOptions: ComboboxProps['onChange'] = (event) => {
    const value = event.target.value.trim();
    if (value && value.length > 0) {
      const matches = dataMapDropdownOptions.filter((o) => o.toLowerCase().indexOf(value?.toLowerCase()) === 0);
      setMatchingOptions(matches);
    }
    if (value.length === 0) {
      setMatchingOptions(dataMapDropdownOptions);
    }
    onSelectOption(value);
  };

  const sortedOptions: string[] = matchingOptions;
  const formattedOptions =
    sortedOptions.length !== 0
      ? sortedOptions.map((option) => optionWithPath(option))
      : dataMapDropdownOptions.map((option) => optionWithPath(option));
  console.log(errorMessage); // danielle need to find a place to put this

  return (
    <div>
      {currentPanelView === ConfigPanelView.UpdateSchema && (
        <div style={{ marginTop: 24 }}>
          <Text className="header-text">
            {schemaType === SchemaType.Source ? updateSourceSchemaHeaderMsg : updateTargetSchemaHeaderMsg}
          </Text>

          {isOverwritingSchema && (
            <MessageBar messageBarType={MessageBarType.warning} styles={{ root: { marginTop: 20 } }}>
              {replaceSchemaWarningLoc}
            </MessageBar>
          )}
        </div>
      )}

      <p className="inform-text">{addOrSelectSchemaMsg}</p>

      <ChoiceGroup
        className="choice-group"
        selectedKey={uploadType}
        options={uploadSchemaOptions}
        onChange={(_e, option) => onChangeUploadType(option)}
        required={true}
      />

      {uploadType === UploadSchemaTypes.UploadNew && (
        <div>
          <input type="file" ref={schemaFileInputRef} onInput={onSelectSchemaFile} accept={acceptedSchemaFileInputExtensions} hidden />
          <Stack horizontal>
            <TextField value={selectedSchemaFile?.name} placeholder={uploadMessage} readOnly />
            <PrimaryButton onClick={() => schemaFileInputRef.current?.click()} style={{ marginLeft: 8 }}>
              {browseLoc}
            </PrimaryButton>
          </Stack>
        </div>
      )}

      {uploadType === UploadSchemaTypes.SelectFrom && (
        <Combobox
          aria-label={dropdownAriaLabel}
          placeholder={schemaDropdownPlaceholder}
          onChange={updateOptions}
          onOptionSelect={(e, data) => setSelectedSchema(data.optionValue)}
          freeform={true}
          autoComplete="on"
          className={styles.combobox}
          appearance="outline"
          //errorMessage={errorMessage}
          //selectedKey={selectedSchema}
        >
          {formattedOptions}
        </Combobox>
      )}
    </div>
  );
};

const optionWithPath: React.FC<string> = (option: string) => {
  const [fileName, filePath] = getFileNameAndPath(option);

  // styling
  const stackTokens: IStackTokens = {
    childrenGap: 5,
  };

  // danielle fix
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const styles = useStyles();

  return (
    <Option text={option} value={option} className={styles.option}>
      <Stack tokens={stackTokens} style={{ width: '100%' }}>
        <Text size={200}>{fileName}</Text>
        {filePath.length !== 0 && <Text size={100}>{filePath}</Text>}
      </Stack>
    </Option>
  );
};
