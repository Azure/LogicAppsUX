import { equals, type ITreeFile, type IFileSysTreeItem, type SchemaNodeExtended, type SchemaExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { usePanelBodyStyles } from './styles';
import type { SchemaFile } from '../../models/Schema';
import FileSelector, { type FileSelectorOption } from '../common/selector/FileSelector';
import { useSelector } from 'react-redux';
import type { RootState } from '../../core/state/Store';
import { DataMapperFileService } from '../../core';
import { SchemaTree } from './tree/SchemaTree';
import { Spinner } from '@fluentui/react-components';
import useSchema from './useSchema';

export interface SchemaPanelBodyProps {
  id: string;
  flattenedSchemaMap?: Record<string, SchemaNodeExtended>;
  schema?: SchemaExtended;
  selectedSchemaFile?: SchemaFile;
  setSelectedSchemaFile: (item?: SchemaFile) => void;
  errorMessage: string;
  fileSelectorOptions: FileSelectorOption;
  setFileSelectorOptions: (option: FileSelectorOption) => void;
  showScehmaSelection?: boolean;
  searchTerm?: string;
}

export const SchemaPanelBody = ({
  id,
  selectedSchemaFile,
  setSelectedSchemaFile,
  fileSelectorOptions,
  setFileSelectorOptions,
  showScehmaSelection,
  flattenedSchemaMap,
  errorMessage,
  searchTerm,
  schema,
}: SchemaPanelBodyProps) => {
  const intl = useIntl();
  const styles = usePanelBodyStyles();
  const { schemaType, toggleEditState } = useSchema({ id });
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
      CANCEL: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '6PdOcy',
        description: 'Cancel',
      }),
    }),
    [intl]
  );

  // Read current schema file options if method exists
  useEffect(() => {
    if (fileService && fileService.readCurrentSchemaOptions && availableSchemaList.length === 0) {
      fileService.readCurrentSchemaOptions();
    }
  }, [fileService, availableSchemaList]);

  const onSelectExistingFile = useCallback(
    (item: IFileSysTreeItem) => {
      setSelectedSchemaFile({
        name: item.name ?? '',
        path: equals(item.type, 'file') ? ((item as ITreeFile).fullPath ?? '') : '',
        type: schemaType,
      });
    },
    [setSelectedSchemaFile, schemaType]
  );

  const onUpload = useCallback(() => {
    DataMapperFileService().getSchemaFromFile(schemaType);
  }, [schemaType]);

  const onCancel = useCallback(() => {
    toggleEditState(false);
  }, [toggleEditState]);

  return (
    <div className={styles.root}>
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
            fileName: selectedSchemaFile?.name,
            onUploadClick: onUpload,
          }}
          existing={{
            fileList: availableSchemaList,
            onSelect: onSelectExistingFile,
          }}
          errorMessage={errorMessage}
          cancel={
            schema && flattenedSchemaMap
              ? {
                  onCancel: onCancel,
                  cancelButtonText: stringResources.CANCEL,
                }
              : undefined
          }
        />
      ) : schema && flattenedSchemaMap ? (
        <div className={styles.treeContainer}>
          <SchemaTree id={id} schema={schema} flattenedSchemaMap={flattenedSchemaMap} searchTerm={searchTerm} />
        </div>
      ) : (!schema || !flattenedSchemaMap) && !errorMessage && selectedSchemaFile ? (
        <Spinner size={'small'} />
      ) : null}
    </div>
  );
};
