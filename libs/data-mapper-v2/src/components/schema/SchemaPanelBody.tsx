import { equals, type ITreeFile, type IFileSysTreeItem, SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useStyles } from './styles';
import { SchemaItemView } from '../schemaView/schemaView';
import type { FileWithVsCodePath, SchemaFile } from '../../models/Schema';
import FileSelector, { type FileSelectorOption } from '../common/selector/FileSelector';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { DataMapperFileService } from '../../core';

export interface SchemaPanelBodyProps {
  schemaType: SchemaType;
  selectedSchema?: string;
  selectedSchemaFile?: SchemaFile;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
  fileSelectorOptions: FileSelectorOption;
  setFileSelectorOptions: (option: FileSelectorOption) => void;
  showScehmaSelection?: boolean;
}

export const SchemaPanelBody = ({
  schemaType,
  selectedSchemaFile,
  setSelectedSchemaFile,
  fileSelectorOptions,
  setFileSelectorOptions,
  showScehmaSelection,
}: SchemaPanelBodyProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const availableSchemaList = useSelector((state: RootState) => state.schema.availableSchemas);
  const fileService = DataMapperFileService();

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
      BROWSE: intl.formatMessage({
        defaultMessage: 'Browse',
        id: 'syiNc+',
        description: 'Browse for file',
      }),
      BROWSE_MESSAGE: intl.formatMessage({
        defaultMessage: 'Select a file to upload',
        id: '2CXCOt',
        description: 'Placeholder for input to load a schema file',
      }),
    }),
    [intl]
  );

  const onSelectExistingFile = useCallback(
    (item: IFileSysTreeItem) => {
      setSelectedSchemaFile({
        name: item.name ?? '',
        path: equals(item.type, 'file') ? (item as ITreeFile).fullPath ?? '' : '',
        type: schemaType ?? SchemaType.Source,
      });
    },
    [setSelectedSchemaFile, schemaType]
  );

  const onOpenClose = useCallback(() => {
    return fileService.readCurrentSchemaOptions ? fileService.readCurrentSchemaOptions : undefined;
  }, [fileService]);

  const onUpload = useCallback(
    (files?: FileList) => {
      if (!files) {
        console.error('Files array is empty');
        return;
      }

      const schemaFile = files[0] as FileWithVsCodePath;
      if (!schemaFile.path) {
        console.log('Path property is missing from file (should only occur in browser/standalone)');
      } else if (schemaFile && schemaType) {
        setSelectedSchemaFile({
          name: schemaFile.name,
          path: schemaFile.path,
          type: schemaType,
        });
      } else {
        console.error('Missing schemaType');
      }
    },
    [schemaType, setSelectedSchemaFile]
  );

  return (
    <div className={styles.bodyWrapper}>
      {showScehmaSelection ? (
        <FileSelector
          selectedKey={fileSelectorOptions}
          options={{
            'upload-new': { text: stringResources.ADD_NEW },
            'select-existing': { text: stringResources.SELECT_EXISTING },
          }}
          onOptionChange={setFileSelectorOptions}
          upload={{
            uploadButtonText: stringResources.BROWSE,
            inputPlaceholder: stringResources.BROWSE_MESSAGE,
            acceptedExtensions: '.xsd, .json',
            fileName: selectedSchemaFile?.name,
            onUpload: onUpload,
          }}
          existing={{
            fileList: availableSchemaList,
            onSelect: onSelectExistingFile,
            onOpenClose: onOpenClose,
          }}
        />
      ) : (
        <SchemaItemView schemaType={schemaType} />
      )}
    </div>
  );
};
