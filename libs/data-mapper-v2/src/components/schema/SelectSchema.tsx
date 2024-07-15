import { SelectExistingSchema } from './SelectExistingSchema';
import { UploadNewSchema } from './UploadNewSchema';
import { ChoiceGroup } from '@fluentui/react';
import type { IChoiceGroupOption } from '@fluentui/react';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';

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

export interface SelectSchemaProps {
  schemaType: SchemaType;
  selectedSchema?: string;
  selectedSchemaFile?: SchemaFile;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
  uploadType: UploadSchemaTypes;
  setUploadType: (newUploadType: UploadSchemaTypes) => void;
  setSelectSchemaVisible: (visible: boolean) => void;
}

export const SelectSchema = ({
  schemaType,
  selectedSchemaFile,
  setSelectedSchemaFile,
  errorMessage,
  uploadType,
  setUploadType,
  setSelectSchemaVisible,
}: SelectSchemaProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const stringResources = useMemo(
    () => ({
      ADD_NEW: intl.formatMessage({
        defaultMessage: 'Add new',
        id: 'rv0Pn+',
        description: 'Add new option',
      }),
      SELECT_EXISTING: intl.formatMessage({
        defaultMessage: 'Select existing',
        id: '2ZfzaY',
        description: 'Select existing option',
      }),
      SOURCE: intl.formatMessage({
        defaultMessage: 'Source',
        id: 'nODesn',
        description: 'Source',
      }),
      DESTINATION: intl.formatMessage({
        defaultMessage: 'Destination',
        id: 'EXEL2j',
        description: 'Destination',
      }),
      SEARCH_PROPERTIES: intl.formatMessage({
        defaultMessage: 'Search properties',
        id: 'BnkCwH',
        description: 'Seach source or target properties',
      }),
    }),
    [intl]
  );

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
      { key: UploadSchemaTypes.UploadNew, text: stringResources.ADD_NEW },
      {
        key: UploadSchemaTypes.SelectFrom,
        text: stringResources.SELECT_EXISTING,
      },
    ],
    [stringResources]
  );

  const onSchemaSelected = (schema: SchemaFile) => {
    setSelectSchemaVisible(false);
    setSelectedSchemaFile(schema);
  };

  return (
    <div className={styles.selectSchemaWrapper}>
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
          setSelectedSchemaFile={onSchemaSelected}
          schemaType={schemaType}
        />
      )}
      {uploadType === UploadSchemaTypes.SelectFrom && (
        <SelectExistingSchema
          errorMessage={errorMessage}
          schemaType={schemaType}
          setSelectedSchema={onSchemaSelected}
        />
      )}
    </div>
  );
};
