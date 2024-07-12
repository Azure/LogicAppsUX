/* eslint-disable @typescript-eslint/no-unused-vars */
import { DataMapperFileService, getSelectedSchema } from '../../core';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { closePanel, ConfigPanelView, openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { convertSchemaToSchemaExtended, getFileNameAndPath } from '../../utils/Schema.Utils';
import { DefaultButton, PrimaryButton } from '@fluentui/react';
import { equals, SchemaType, type DataMapSchema } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useStyles } from './styles';
import { Panel } from '../../components/common/panel/Panel';
import { SchemaPanelBody } from './SchemaPanelBody';
import { type SchemaFile, UploadSchemaTypes } from '../../models/Schema';

import { mergeClasses } from '@fluentui/react-components';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  schemaType: SchemaType;
}

export const SchemaPanel = ({ onSubmitSchemaFileSelection, schemaType }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();
  const fileService = DataMapperFileService();

  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const currentPanelView = useSelector((state: RootState) => {
    return state.panel.currentPanelView;
  });

  const [uploadType, setUploadType] = useState<UploadSchemaTypes>(UploadSchemaTypes.SelectFrom);
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [selectedSchema, setSelectedSchema] = useState<DataMapSchema>();
  const [errorMessage, setErrorMessage] = useState('');
  const [selectSchemaVisible, setSelectSchemaVisible] = useState<boolean>(true);

  const showScehmaSelection = useMemo(() => !selectedSchemaFile || selectSchemaVisible, [selectedSchemaFile, selectSchemaVisible]);

  const fetchedSourceSchema = useQuery(
    [selectedSchemaFile],
    async () => {
      if (selectedSchema && selectedSchemaFile) {
        const [fileName, filePath] = getFileNameAndPath(selectedSchemaFile?.path);
        return await getSelectedSchema(fileName ?? '', filePath);
      }
      return await getSelectedSchema(selectedSchemaFile?.name ?? '', selectedSchemaFile?.path ?? '');
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedSchema !== undefined,
    }
  );

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

  const addLoc = intl.formatMessage({
    defaultMessage: 'Add',
    id: 'F9dR1Q',
    description: 'Add',
  });

  const saveLoc = intl.formatMessage({
    defaultMessage: 'Save',
    id: '0CvRZW',
    description: 'Save',
  });

  const cancelLoc = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: '6PdOcy',
    description: 'Cancel',
  });

  const genericErrorMsg = intl.formatMessage({
    defaultMessage: 'Failed to load the schema. Please try again.',
    id: '6fDYzG',
    description: 'Load schema error message',
  });

  const goBackToDefaultConfigPanelView = useCallback(() => {
    dispatch(openDefaultConfigPanelView());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const closeEntirePanel = useCallback(() => {
    dispatch(closePanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const onSubmitSchema = useCallback(
    (schema: DataMapSchema) => {
      if (schemaType) {
        const extendedSchema = convertSchemaToSchemaExtended(schema);
        dispatch(setInitialSchema({ schema: extendedSchema, schemaType: schemaType }));
      }
    },
    [dispatch, schemaType]
  );

  const addOrUpdateSchema = useCallback(
    (isAddSchema?: boolean) => {
      if (schemaType === undefined) {
        return;
      }

      LogService.log(LogCategory.AddOrUpdateSchemaView, 'addOrChangeSchema', {
        message: `${isAddSchema ? 'Added' : 'Changed'} ${schemaType} schema from ${
          uploadType === UploadSchemaTypes.SelectFrom ? 'existing schema files' : 'new file upload'
        }`,
      });

      // Catch specific errors from GET schemaTree or otherwise
      const schemaLoadError = fetchedSourceSchema.error;
      if (schemaLoadError) {
        if (typeof schemaLoadError === 'string') {
          setErrorMessage(schemaLoadError);
          LogService.error(LogCategory.AddOrUpdateSchemaView, 'schemaLoadError', {
            message: schemaLoadError,
          });
        } else if (schemaLoadError instanceof Error) {
          setErrorMessage(schemaLoadError.message);
          LogService.error(LogCategory.AddOrUpdateSchemaView, 'schemaLoadError', {
            message: schemaLoadError.message,
          });
        }

        return;
      }

      if (uploadType === UploadSchemaTypes.SelectFrom && selectedSchema) {
        onSubmitSchema(selectedSchema);
      } else if (uploadType === UploadSchemaTypes.UploadNew && selectedSchemaFile) {
        onSubmitSchemaFileSelection(selectedSchemaFile);
      }

      if (selectedSchema || selectedSchemaFile) {
        isAddSchema ? closeEntirePanel() : goBackToDefaultConfigPanelView();
        setErrorMessage('');
      } else {
        setErrorMessage(genericErrorMsg);
      }
    },
    [
      schemaType,
      closeEntirePanel,
      goBackToDefaultConfigPanelView,
      genericErrorMsg,
      selectedSchemaFile,
      uploadType,
      onSubmitSchemaFileSelection,
      fetchedSourceSchema,
      onSubmitSchema,
      selectedSchema,
    ]
  );

  // Read current schema file options if method exists
  useEffect(() => {
    if (fileService && fileService.readCurrentSchemaOptions) {
      fileService.readCurrentSchemaOptions();
    }
  }, [fileService]);

  const onRenderFooterContent = useCallback(() => {
    if (currentPanelView === ConfigPanelView.DefaultConfig) {
      return null;
    }

    let isNoNewSchemaSelected = true;

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      if (schemaType === SchemaType.Source) {
        isNoNewSchemaSelected = !selectedSchema || selectedSchema.name === curDataMapOperation.sourceSchema?.name;
      } else {
        isNoNewSchemaSelected = !selectedSchema || selectedSchema.name === curDataMapOperation.targetSchema?.name;
      }
    } else {
      isNoNewSchemaSelected = !selectedSchemaFile;
    }

    return (
      <div>
        <PrimaryButton
          className="panel-button-left"
          onClick={() => addOrUpdateSchema(currentPanelView === ConfigPanelView.AddSchema)}
          disabled={isNoNewSchemaSelected}
        >
          {currentPanelView === ConfigPanelView.AddSchema ? addLoc : saveLoc}
        </PrimaryButton>

        <DefaultButton onClick={goBackToDefaultConfigPanelView}>{cancelLoc}</DefaultButton>
      </div>
    );
  }, [
    currentPanelView,
    schemaType,
    curDataMapOperation,
    saveLoc,
    goBackToDefaultConfigPanelView,
    cancelLoc,
    addOrUpdateSchema,
    selectedSchemaFile,
    uploadType,
    addLoc,
    selectedSchema,
  ]);

  return (
    <Panel
      id={`panel_${schemaType}`}
      isOpen={!!currentPanelView}
      title={{
        text: equals(schemaType, SchemaType.Source) ? stringResources.SOURCE : stringResources.DESTINATION,
      }}
      search={
        showScehmaSelection
          ? undefined
          : {
              placeholder: stringResources.SEARCH_PROPERTIES,
              onChange: (_?: string) => {},
            }
      }
      styles={{
        root: mergeClasses(styles.root, showScehmaSelection ? styles.rootWithSchemaSelection : styles.rootWithSchemaTree),
      }}
      body={
        <SchemaPanelBody
          schemaType={schemaType}
          selectedSchema={selectedSchema?.name}
          setSelectedSchemaFile={setSelectedSchemaFile}
          selectedSchemaFile={selectedSchemaFile}
          errorMessage={errorMessage}
          uploadType={uploadType}
          setUploadType={setUploadType}
          setSelectSchemaVisible={setSelectSchemaVisible}
          showScehmaSelection={showScehmaSelection}
        />
      }
    />
  );
};
