import { getSelectedSchema } from '../../core';
import { setInitialDataMap, setInitialSchema } from '../../core/state/DataMapSlice';
import { closePanel, ConfigPanelView, openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { Schema } from '../../models';
import { SchemaTypes } from '../../models';
import { convertSchemaToSchemaExtended, flattenSchema } from '../../utils/Schema.Utils';
import type { SchemaFile } from './AddOrUpdateSchemaView';
import { AddOrUpdateSchemaView, UploadSchemaTypes } from './AddOrUpdateSchemaView';
import { DefaultConfigView } from './DefaultConfigView';
import type { IDropdownOption, IPanelProps, IRenderFunction } from '@fluentui/react';
import { DefaultButton, IconButton, Panel, PrimaryButton, Text } from '@fluentui/react';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export interface EditorConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
}

export const EditorConfigPanel = ({ readCurrentSchemaOptions, onSubmitSchemaFileSelection }: EditorConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.curDataMapOperation);
  const currentPanelView = useSelector((state: RootState) => state.panel.currentPanelView);
  const schemaType = useSelector((state: RootState) => state.panel.schemaType);

  const [uploadType, setUploadType] = useState<UploadSchemaTypes>(UploadSchemaTypes.SelectFrom);
  const [selectedSourceSchema, setSelectedSourceSchema] = useState<IDropdownOption>();
  const [selectedTargetSchema, setSelectedTargetSchema] = useState<IDropdownOption>();
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, setErrorMessage] = useState('');

  const fetchedSourceSchema = useQuery(
    [selectedSourceSchema?.text],
    () => {
      return getSelectedSchema(selectedSourceSchema?.text ?? '');
    },
    {
      enabled: selectedSourceSchema !== undefined,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5,
    }
  );

  const fetchedTargetSchema = useQuery(
    [selectedTargetSchema?.text],
    () => {
      return getSelectedSchema(selectedTargetSchema?.text ?? '');
    },
    {
      enabled: selectedTargetSchema !== undefined,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5,
    }
  );

  const saveMessage = intl.formatMessage({
    defaultMessage: 'Save',
    description: 'Save',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel',
  });
  const configurationHeader = intl.formatMessage({
    defaultMessage: 'Configure',
    description: 'Header text to inform users this panel is for configuration',
  });
  const genericErrMsg = intl.formatMessage({
    defaultMessage: 'Failed loading the schema. Please try again.',
    description: 'error message for loading the schema',
  });
  const updateSourceSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add source schema',
    description: 'header message for adding source schema',
  });
  const updateTargetSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add target schema',
    description: 'header message for adding target schema',
  });
  const backMessage = intl.formatMessage({
    defaultMessage: 'Back',
    description: 'button message for going back a panel to the default panel layer',
  });
  const closeAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'aria label for close icon button that closes that panel on click',
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
        dispatch(
          setInitialSchema({ schema: extendedSchema, schemaType: schemaType, flattenedSchema: flattenSchema(extendedSchema, schemaType) })
        );
        dispatch(setInitialDataMap(undefined));
      }
    },
    [dispatch, schemaType]
  );

  const editSchema = useCallback(() => {
    const selectedSchema = schemaType === SchemaTypes.Source ? (fetchedSourceSchema.data as Schema) : (fetchedTargetSchema.data as Schema);

    if (selectedSchema) {
      onSubmitSchema(selectedSchema);
      setErrorMessage('');
      goBackToDefaultConfigPanelView();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [goBackToDefaultConfigPanelView, onSubmitSchema, genericErrMsg, fetchedSourceSchema, fetchedTargetSchema, schemaType]);

  const addSchema = useCallback(() => {
    if (schemaType === undefined) {
      return;
    }

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      editSchema();
    } else if (uploadType === UploadSchemaTypes.UploadNew) {
      setErrorMessage('');

      if (selectedSchemaFile) {
        onSubmitSchemaFileSelection(selectedSchemaFile);
        setSelectedSchemaFile(undefined);
        goBackToDefaultConfigPanelView();
      } else {
        setErrorMessage(genericErrMsg);
      }
    }
  }, [schemaType, editSchema, goBackToDefaultConfigPanelView, genericErrMsg, selectedSchemaFile, uploadType, onSubmitSchemaFileSelection]);

  // Update schema on any dependency change
  // TODO: Test if this is necessary, and/or even poorly-performant
  useEffect(() => {
    editSchema();
  }, [goBackToDefaultConfigPanelView, dispatch, editSchema, genericErrMsg, onSubmitSchema, schemaType, selectedSourceSchema]);

  // Read current schema file options if method exists
  useEffect(() => {
    if (readCurrentSchemaOptions) {
      readCurrentSchemaOptions();
    }
  }, [readCurrentSchemaOptions]);

  const onRenderNavigationContent: IRenderFunction<IPanelProps> = useCallback(
    (props, defaultRender) => (
      <div className="custom-navigation">
        {currentPanelView === ConfigPanelView.UpdateSchema && (
          <div>
            <IconButton
              iconProps={{ iconName: 'Back' }}
              title={backMessage}
              ariaLabel={backMessage}
              onClick={goBackToDefaultConfigPanelView}
            />
            <Text className="back-header-text">{backMessage}</Text>
          </div>
        )}

        {currentPanelView === ConfigPanelView.DefaultConfig && <Text className="header-text">{configurationHeader}</Text>}

        {currentPanelView === ConfigPanelView.AddSchema && (
          <Text className="header-text">
            {schemaType === SchemaTypes.Source ? updateSourceSchemaHeaderMsg : updateTargetSchemaHeaderMsg}
          </Text>
        )}

        {(currentPanelView === ConfigPanelView.DefaultConfig || currentPanelView === ConfigPanelView.AddSchema) && defaultRender?.(props)}
      </div>
    ),
    [
      updateSourceSchemaHeaderMsg,
      updateTargetSchemaHeaderMsg,
      configurationHeader,
      currentPanelView,
      goBackToDefaultConfigPanelView,
      schemaType,
      backMessage,
    ]
  );

  const onRenderFooterContent = useCallback(() => {
    if (currentPanelView !== ConfigPanelView.UpdateSchema) {
      return null;
    }

    let isNoNewSchemaSelected = true;

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      if (schemaType === SchemaTypes.Source) {
        isNoNewSchemaSelected = !selectedSourceSchema || selectedSourceSchema.key === curDataMapOperation.sourceSchema?.name;
      } else {
        isNoNewSchemaSelected = !selectedTargetSchema || selectedTargetSchema.key === curDataMapOperation.targetSchema?.name;
      }
    } else {
      isNoNewSchemaSelected = !selectedSchemaFile;
    }

    return (
      <div>
        <PrimaryButton className="panel-button-left" onClick={addSchema} disabled={isNoNewSchemaSelected}>
          {saveMessage}
        </PrimaryButton>

        <DefaultButton onClick={closeEntirePanel}>{cancelMessage}</DefaultButton>
      </div>
    );
  }, [
    currentPanelView,
    schemaType,
    curDataMapOperation,
    selectedSourceSchema,
    selectedTargetSchema,
    saveMessage,
    closeEntirePanel,
    cancelMessage,
    addSchema,
    selectedSchemaFile,
    uploadType,
  ]);

  return (
    <div>
      <Panel
        className="config-panel"
        isOpen={!!currentPanelView}
        onDismiss={closeEntirePanel}
        onRenderNavigationContent={onRenderNavigationContent}
        closeButtonAriaLabel={closeAriaLabel}
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
        isLightDismiss
      >
        {currentPanelView === ConfigPanelView.DefaultConfig && <DefaultConfigView />}

        {(currentPanelView === ConfigPanelView.AddSchema || currentPanelView === ConfigPanelView.UpdateSchema) && (
          <AddOrUpdateSchemaView
            schemaType={schemaType}
            selectedSchema={schemaType === SchemaTypes.Source ? selectedSourceSchema : selectedTargetSchema}
            setSelectedSchema={schemaType === SchemaTypes.Source ? setSelectedSourceSchema : setSelectedTargetSchema}
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
