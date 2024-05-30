import { SelectExistingSchema } from './SelectExistingSchema';
import { UploadNewSchema } from './UploadNewSchema';
import { ChoiceGroup, Text } from '@fluentui/react';
import type { IChoiceGroupOption } from '@fluentui/react';
import { SchemaType, equals } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { mergeClasses } from '@fluentui/react-components';
import { SchemaItemView } from '../schemaView/schemaView';

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
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  getUpdatedSchemaFiles: () => void;
  errorMessage: string;
  uploadType: UploadSchemaTypes;
  setUploadType: (newUploadType: UploadSchemaTypes) => void;
  customHeaderChildren?: React.ReactElement;
}

export const AddOrUpdateSchemaView = ({
  schemaType,
  selectedSchemaFile,
  setSelectedSchemaFile,
  getUpdatedSchemaFiles,
  errorMessage,
  uploadType,
  setUploadType,
  customHeaderChildren,
}: AddOrUpdateSchemaViewProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const [selectSchemaVisible, setSelectSchemaVisible] = useState<boolean>(true);

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

  return (
    <div
      className={mergeClasses(
        styles.drawerRoot,
        selectedSchemaFile ? styles.fileSelectedDrawer : '',
        schemaType === SchemaType.Source ? styles.leftDrawer : styles.rightDrawer
      )}
    >
      <div className={styles.headerWrapper}>
        <Text className={styles.header}>
          {equals(schemaType, SchemaType.Source) ? stringResources.SOURCE : stringResources.DESTINATION}
        </Text>
        {customHeaderChildren && <div className={styles.rightCustomHeader}>{customHeaderChildren}</div>}
      </div>

      <div className={styles.bodyWrapper}>
        {!selectedSchemaFile || selectSchemaVisible ? (
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
                setSelectedSchemaFile={setSelectedSchemaFile}
                schemaType={schemaType}
              />
            )}
            {uploadType === UploadSchemaTypes.SelectFrom && (
              <SelectExistingSchema
                errorMessage={errorMessage}
                schemaType={schemaType}
                setSelectedSchema={(schema: SchemaFile) => {
                  setSelectSchemaVisible(false);
                  setSelectedSchemaFile(schema);
                }}
                getUpdatedSchemaFiles={getUpdatedSchemaFiles}
              />
            )}
          </div>
        ) : (
          <SchemaItemView schemaType={schemaType} />
        )}
      </div>
    </div>
  );
};
