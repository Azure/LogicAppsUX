import { ConfigPanelView } from '../../core/state/PanelSlice';
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '../../models';
import { SelectExistingSchema } from './SelectExistingSchema';
import { UploadNewSchema } from './UploadNewSchema';
import { ChoiceGroup, MessageBar, MessageBarType } from '@fluentui/react';
import type { IChoiceGroupOption } from '@fluentui/react';
import { Text } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const acceptedSchemaFileInputExtensions = '.xsd, .json';

export const UploadSchemaTypes = {
  UploadNew: 'upload-new',
  SelectFrom: 'select-from',
} as const;
export type UploadSchemaTypes = (typeof UploadSchemaTypes)[keyof typeof UploadSchemaTypes];

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
  const { sourceSchema: curSourceSchema, targetSchema: curTargetSchema } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );
  const currentPanelView = useSelector((state: RootState) => state.panel.currentPanelView);

  const replaceSchemaWarningLoc = intl.formatMessage({
    defaultMessage: 'Replacing an existing schema with an incompatible schema might create errors in your map.',
    description: 'Message bar warning about replacing existing schema',
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

  const onChangeUploadType = useCallback(
    (option?: IChoiceGroupOption) => {
      if (option) {
        setUploadType(option.key as UploadSchemaTypes);
      }
    },
    [setUploadType]
  );

  const uploadSchemaOptions: IChoiceGroupOption[] = useMemo(
    () => [
      { key: UploadSchemaTypes.UploadNew, text: addNewLoc },
      { key: UploadSchemaTypes.SelectFrom, text: selectExistingLoc },
    ],
    [addNewLoc, selectExistingLoc]
  );

  const isOverwritingSchema = useMemo(
    () => (schemaType === SchemaType.Source ? !!curSourceSchema : !!curTargetSchema),
    [schemaType, curSourceSchema, curTargetSchema]
  );

  const [addOrSelectSchemaMsg] = useMemo(() => {
    if (schemaType === SchemaType.Source) {
      return [
        intl.formatMessage({
          defaultMessage: 'Add or select a source schema to use for your map.',
          description: 'label to inform to upload or select source schema to be used',
        }),
      ];
    } else {
      return [
        intl.formatMessage({
          defaultMessage: 'Add or select a target schema to use for your map.',
          description: 'label to inform to upload or select target schema to be used',
        }),
      ];
    }
  }, [intl, schemaType]);

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
        <UploadNewSchema
          acceptedSchemaFileInputExtensions={acceptedSchemaFileInputExtensions}
          selectedSchemaFile={selectedSchemaFile}
          setSelectedSchemaFile={setSelectedSchemaFile}
          schemaType={schemaType}
        />
      )}

      {uploadType === UploadSchemaTypes.SelectFrom && (
        <SelectExistingSchema errorMessage={errorMessage} schemaType={schemaType} setSelectedSchema={setSelectedSchema} />
      )}
    </div>
  );
};
