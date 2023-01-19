import { getSelectedSchema } from '../../core';
import appInsights from '../../core/services/appInsights/AppInsights';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { closePanel, ConfigPanelView, openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { Schema } from '../../models';
import { SchemaType } from '../../models';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaFile } from './AddOrUpdateSchemaView';
import { AddOrUpdateSchemaView, UploadSchemaTypes } from './AddOrUpdateSchemaView';
import { DefaultConfigView } from './DefaultConfigView';
import { DefaultButton, IconButton, Panel, PrimaryButton, Text, Stack } from '@fluentui/react';
import type { IDropdownOption, IPanelProps, IRenderFunction } from '@fluentui/react';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
}

export const ConfigPanel = ({ readCurrentSchemaOptions, onSubmitSchemaFileSelection }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.curDataMapOperation);
  const currentPanelView = useSelector((state: RootState) => state.panel.currentPanelView);
  const schemaType = useSelector((state: RootState) => state.panel.schemaType);
  const currentTheme = useSelector((state: RootState) => state.app.theme);

  const [uploadType, setUploadType] = useState<UploadSchemaTypes>(UploadSchemaTypes.SelectFrom);
  const [selectedSourceSchema, setSelectedSourceSchema] = useState<IDropdownOption>();
  const [selectedTargetSchema, setSelectedTargetSchema] = useState<IDropdownOption>();
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, setErrorMessage] = useState('');

  const fetchedSourceSchema = useQuery(
    [selectedSourceSchema?.text],
    async () => await getSelectedSchema(selectedSourceSchema?.text ?? ''),
    {
      ...schemaFileQuerySettings,
      enabled: selectedSourceSchema !== undefined,
    }
  );

  const fetchedTargetSchema = useQuery(
    [selectedTargetSchema?.text],
    async () => await getSelectedSchema(selectedTargetSchema?.text ?? ''),
    {
      ...schemaFileQuerySettings,
      enabled: selectedTargetSchema !== undefined,
    }
  );

  const addLoc = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Add',
  });

  const saveLoc = intl.formatMessage({
    defaultMessage: 'Save',
    description: 'Save',
  });

  const cancelLoc = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel',
  });

  const configureLoc = intl.formatMessage({
    defaultMessage: 'Configure',
    description: 'Configure',
  });

  const backLoc = intl.formatMessage({
    defaultMessage: 'Back',
    description: 'Back',
  });

  const closeLoc = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close',
  });

  const genericErrorMsg = intl.formatMessage({
    defaultMessage: 'Failed loading the schema. Please try again.',
    description: 'Load schema error message',
  });

  const addSourceSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add source schema',
    description: 'Header to add source schema',
  });

  const addTargetSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add target schema',
    description: 'Header to add target schema',
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
    (schema: Schema) => {
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

      // Catch specific errors from GET schemaTree or otherwise
      const schemaLoadError = schemaType === SchemaType.Source ? fetchedSourceSchema.error : fetchedTargetSchema.error;
      if (schemaLoadError) {
        if (typeof schemaLoadError === 'string') {
          appInsights.trackException({ exception: new Error(schemaLoadError) });
          setErrorMessage(schemaLoadError);
        } else if (schemaLoadError instanceof Error) {
          appInsights.trackException({ exception: schemaLoadError });
          setErrorMessage(schemaLoadError.message);
        }

        return;
      }

      const selectedSchema = schemaType === SchemaType.Source ? (fetchedSourceSchema.data as Schema) : (fetchedTargetSchema.data as Schema);

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

  const onRenderNavigationContent: IRenderFunction<IPanelProps> = useCallback(
    (props, defaultRender) => (
      <Stack className="custom-navigation" horizontal horizontalAlign="space-between">
        {currentPanelView === ConfigPanelView.UpdateSchema && (
          <div>
            <Stack horizontal verticalAlign="center">
              <IconButton iconProps={{ iconName: 'Back' }} title={backLoc} ariaLabel={backLoc} onClick={goBackToDefaultConfigPanelView} />
              <Text className="back-header-text">{backLoc}</Text>
            </Stack>
          </div>
        )}

        {currentPanelView === ConfigPanelView.DefaultConfig && <Text className="header-text">{configureLoc}</Text>}

        {currentPanelView === ConfigPanelView.AddSchema && (
          <Text className="header-text">{schemaType === SchemaType.Source ? addSourceSchemaHeaderMsg : addTargetSchemaHeaderMsg}</Text>
        )}

        {(currentPanelView === ConfigPanelView.DefaultConfig || currentPanelView === ConfigPanelView.AddSchema) && defaultRender?.(props)}
      </Stack>
    ),
    [
      addSourceSchemaHeaderMsg,
      addTargetSchemaHeaderMsg,
      configureLoc,
      currentPanelView,
      goBackToDefaultConfigPanelView,
      schemaType,
      backLoc,
    ]
  );

  const onRenderFooterContent = useCallback(() => {
    if (currentPanelView === ConfigPanelView.DefaultConfig) {
      return null;
    }

    let isNoNewSchemaSelected = true;

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      if (schemaType === SchemaType.Source) {
        isNoNewSchemaSelected = !selectedSourceSchema || selectedSourceSchema.key === curDataMapOperation.sourceSchema?.name;
      } else {
        isNoNewSchemaSelected = !selectedTargetSchema || selectedTargetSchema.key === curDataMapOperation.targetSchema?.name;
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

        <DefaultButton onClick={closeEntirePanel}>{cancelLoc}</DefaultButton>
      </div>
    );
  }, [
    currentPanelView,
    schemaType,
    curDataMapOperation,
    selectedSourceSchema,
    selectedTargetSchema,
    saveLoc,
    closeEntirePanel,
    cancelLoc,
    addOrUpdateSchema,
    selectedSchemaFile,
    uploadType,
    addLoc,
  ]);

  return (
    <div>
      <Panel
        className="config-panel"
        isOpen={!!currentPanelView}
        onDismiss={closeEntirePanel}
        onRenderNavigationContent={onRenderNavigationContent}
        closeButtonAriaLabel={closeLoc}
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
        overlayProps={{ isDarkThemed: currentTheme === 'dark' }}
        isLightDismiss
      >
        {currentPanelView === ConfigPanelView.DefaultConfig && <DefaultConfigView />}

        {(currentPanelView === ConfigPanelView.AddSchema || currentPanelView === ConfigPanelView.UpdateSchema) && (
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
        )}
      </Panel>
    </div>
  );
};
