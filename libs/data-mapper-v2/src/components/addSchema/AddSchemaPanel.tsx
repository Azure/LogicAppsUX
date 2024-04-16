/* eslint-disable @typescript-eslint/no-unused-vars */
import { getSelectedSchema } from '../../core';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { closePanel, ConfigPanelView, openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { convertSchemaToSchemaExtended, getFileNameAndPath } from '../../utils/Schema.Utils';
import type { SchemaFile } from './AddOrUpdateSchemaView';
import { AddOrUpdateSchemaView, UploadSchemaTypes } from './AddOrUpdateSchemaView';
//import { DefaultConfigView } from './DefaultConfigView';
import { DefaultButton, Panel, PrimaryButton } from '@fluentui/react';
import type { DataMapSchema } from '@microsoft/logic-apps-shared';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { DrawerBody, DrawerHeader, DrawerHeaderTitle, InlineDrawer, makeStyles } from '@fluentui/react-components';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100vh',
  },
  drawer: {
    backgroundColor: '#fff',
  },
});

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
  schemaType: SchemaType;
}

export const AddSchemaDrawer = ({ readCurrentSchemaOptions, onSubmitSchemaFileSelection, schemaType }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const currentPanelView = useSelector((state: RootState) => {
    return state.panel.currentPanelView;
  });
  const currentTheme = useSelector((state: RootState) => state.app.theme);

  const [uploadType, setUploadType] = useState<UploadSchemaTypes>(UploadSchemaTypes.SelectFrom);
  const [selectedSourceSchema, setSelectedSourceSchema] = useState<string>();
  const [selectedTargetSchema, setSelectedTargetSchema] = useState<string>();
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, setErrorMessage] = useState('');

  const fetchedSourceSchema = useQuery(
    [selectedSourceSchema],
    async () => {
      if (selectedSourceSchema) {
        const [fileName, filePath] = getFileNameAndPath(selectedSourceSchema);
        return await getSelectedSchema(fileName ?? '', filePath);
      } else return await getSelectedSchema(selectedSourceSchema ?? '', '');
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedSourceSchema !== undefined,
    }
  );

  const fetchedTargetSchema = useQuery(
    [selectedTargetSchema],
    async () => {
      if (selectedTargetSchema) {
        const [fileName, filePath] = getFileNameAndPath(selectedTargetSchema);

        return await getSelectedSchema(fileName ?? '', filePath);
      } else return await getSelectedSchema(selectedTargetSchema ?? '', '');
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedTargetSchema !== undefined,
    }
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

  const configureLoc = intl.formatMessage({
    defaultMessage: 'Configure',
    id: 'LR/3Lr',
    description: 'Configure',
  });

  const closeLoc = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'wzEneQ',
    description: 'Close',
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
      const schemaLoadError = schemaType === SchemaType.Source ? fetchedSourceSchema.error : fetchedTargetSchema.error;
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

      const selectedSchema =
        schemaType === SchemaType.Source ? (fetchedSourceSchema.data as DataMapSchema) : (fetchedTargetSchema.data as DataMapSchema);

      if (uploadType === UploadSchemaTypes.SelectFrom && selectedSchema) {
        onSubmitSchema(selectedSchema);
      } else if (uploadType === UploadSchemaTypes.UploadNew && selectedSchemaFile) {
        onSubmitSchemaFileSelection(selectedSchemaFile);
        setSelectedSchemaFile(undefined);
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
      fetchedTargetSchema,
      onSubmitSchema,
    ]
  );

  // Read current schema file options if method exists
  useEffect(() => {
    if (readCurrentSchemaOptions) {
      readCurrentSchemaOptions();
    }
  }, [readCurrentSchemaOptions]);

  const onRenderFooterContent = useCallback(() => {
    if (currentPanelView === ConfigPanelView.DefaultConfig) {
      return null;
    }

    let isNoNewSchemaSelected = true;

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      if (schemaType === SchemaType.Source) {
        isNoNewSchemaSelected = !selectedSourceSchema || selectedSourceSchema === curDataMapOperation.sourceSchema?.name;
      } else {
        isNoNewSchemaSelected = !selectedTargetSchema || selectedTargetSchema === curDataMapOperation.targetSchema?.name;
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
    selectedSourceSchema,
    selectedTargetSchema,
    saveLoc,
    goBackToDefaultConfigPanelView,
    cancelLoc,
    addOrUpdateSchema,
    selectedSchemaFile,
    uploadType,
    addLoc,
  ]);

  return (
    <div className={styles.root}>
      <InlineDrawer
        open={!!currentPanelView}
        size="small"
        className={styles.drawer}

        // onDismiss={closeEntirePanel}
        // closeButtonAriaLabel={closeLoc}
        // onRenderFooterContent={onRenderFooterContent}
        // isFooterAtBottom={true}
        // overlayProps={{ isDarkThemed: currentTheme === 'dark' }}
        // isLightDismiss
      >
        {/* {currentPanelView === ConfigPanelView.DefaultConfig && (
          <DefaultConfigView setFunctionDisplayExpanded={setFunctionDisplayExpanded} useExpandedFunctionCards={useExpandedFunctionCards} />
        )} */}

        <DrawerHeader>
          <DrawerHeaderTitle>{schemaType === SchemaType.Source ? 'Source' : 'Target'}</DrawerHeaderTitle>
        </DrawerHeader>

        <DrawerBody>
          <AddOrUpdateSchemaView
            schemaType={schemaType}
            selectedSchema={schemaType === SchemaType.Source ? selectedSourceSchema : selectedTargetSchema}
            setSelectedSchema={schemaType === SchemaType.Source ? setSelectedSourceSchema : setSelectedTargetSchema}
            selectedSchemaFile={selectedSchemaFile}
            setSelectedSchemaFile={setSelectedSchemaFile}
            errorMessage={errorMessage}
            uploadType={uploadType}
            setUploadType={setUploadType}
          />
        </DrawerBody>
      </InlineDrawer>
    </div>
  );
};
