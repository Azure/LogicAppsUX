import { getSelectedSchema } from '../../core';
import { setInitialDataMap, setInitialSchema } from '../../core/state/DataMapSlice';
import { closeAllWarning, openChangeSchemaWarning, removeOkClicked, WarningModalState } from '../../core/state/ModalSlice';
import { closeDefaultConfigPanel, closeSchemaChangePanel, openInputSchemaPanel, openOutputSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { Schema } from '../../models';
import { SchemaTypes } from '../../models';
import { convertSchemaToSchemaExtended, flattenSchema } from '../../utils/Schema.Utils';
import type { SchemaFile } from './ChangeSchemaView';
import { ChangeSchemaView, UploadSchemaTypes } from './ChangeSchemaView';
import { DefaultPanelView } from './DefaultPanelView';
import type { IDropdownOption, IPanelProps, IRenderFunction } from '@fluentui/react';
import { DefaultButton, IconButton, Panel, PrimaryButton, Text } from '@fluentui/react';
import type { FunctionComponent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export interface EditorConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  readCurrentSchemaOptions: () => void;
}

export const EditorConfigPanel: FunctionComponent<EditorConfigPanelProps> = ({ readCurrentSchemaOptions, onSubmitSchemaFileSelection }) => {
  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.curDataMapOperation);
  const isDirty = useSelector((state: RootState) => state.dataMap.isDirty);
  const isDefaultPanelOpen = useSelector((state: RootState) => state.panel.isDefaultConfigPanelOpen);
  const isChangeSchemaPanelOpen = useSelector((state: RootState) => state.panel.isChangeSchemaPanelOpen);
  const schemaType = useSelector((state: RootState) => state.panel.schemaType);
  const isChangeSchemaConfirmed = useSelector(
    (state: RootState) =>
      (state.modal.warningModalType === WarningModalState.ChangeInputWarning ||
        state.modal.warningModalType === WarningModalState.ChangeOutputWarning) &&
      state.modal.isOkClicked
  );
  const [uploadType, setUploadType] = useState<UploadSchemaTypes>(UploadSchemaTypes.SelectFrom);
  const [selectedInputSchema, setSelectedInputSchema] = useState<IDropdownOption>();
  const [selectedOutputSchema, setSelectedOutputSchema] = useState<IDropdownOption>();
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, setErrorMessage] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

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

  const addMessage = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Button text for Add to add the selected schema file to use',
  });
  const discardMessage = intl.formatMessage({
    defaultMessage: 'Discard',
    description: 'Button text for discard the changes and close the panel.',
  });
  const configurationHeader = intl.formatMessage({
    defaultMessage: 'Configuration',
    description: 'Header text to inform users this panel is for configuration.',
  });
  const genericErrMsg = intl.formatMessage({
    defaultMessage: 'Failed loading the schema. Please try again.',
    description: 'error message for loading the schema',
  });
  const addInputSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add Input Schema',
    description: 'header message for adding input schema',
  });
  const addOutputSchemaHeaderMsg = intl.formatMessage({
    defaultMessage: 'Add Output Schema',
    description: 'header message for adding output schema',
  });
  const backMessage = intl.formatMessage({
    defaultMessage: 'Back',
    description: 'button message for going back a panel to the default panel layer',
  });
  const closeAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'aria label for close icon button that closes that panel on click',
  });

  const fetchedInputSchema = useQuery(
    [selectedInputSchema?.text],
    () => {
      return getSelectedSchema(selectedInputSchema?.text ?? '');
    },
    {
      enabled: selectedInputSchema !== undefined,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5,
    }
  );

  const fetchedOutputSchema = useQuery(
    [selectedOutputSchema?.text],
    () => {
      return getSelectedSchema(selectedOutputSchema?.text ?? '');
    },
    {
      enabled: selectedOutputSchema !== undefined,
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 5,
    }
  );

  const hideEntirePanel = useCallback(() => {
    dispatch(closeDefaultConfigPanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const closeSchemaPanel = useCallback(() => {
    dispatch(closeSchemaChangePanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const editSchema = useCallback(() => {
    const selectedSchema = schemaType === SchemaTypes.Input ? (fetchedInputSchema.data as Schema) : (fetchedOutputSchema.data as Schema);

    setErrorMessage('');
    if (selectedSchema) {
      onSubmitSchema(selectedSchema);
      closeSchemaPanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [closeSchemaPanel, onSubmitSchema, genericErrMsg, fetchedInputSchema, fetchedOutputSchema, schemaType]);

  const addSchema = useCallback(() => {
    if (schemaType === undefined) {
      return;
    }

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      isDirty ? dispatch(openChangeSchemaWarning({ schemaType: schemaType })) : editSchema();
    } else if (uploadType === UploadSchemaTypes.UploadNew) {
      if (isDirty) {
        dispatch(openChangeSchemaWarning({ schemaType: schemaType }));
      } else {
        setErrorMessage('');
        if (selectedSchemaFile) {
          onSubmitSchemaFileSelection(selectedSchemaFile);
          setSelectedSchemaFile(undefined);
          closeSchemaPanel();
        } else {
          setErrorMessage(genericErrMsg);
        }
      }
    }
  }, [
    isDirty,
    schemaType,
    editSchema,
    dispatch,
    closeSchemaPanel,
    genericErrMsg,
    selectedSchemaFile,
    uploadType,
    onSubmitSchemaFileSelection,
  ]);

  useEffect(() => {
    if (isChangeSchemaConfirmed) {
      dispatch(removeOkClicked());
      editSchema();
      dispatch(closeAllWarning());
    }
  }, [closeSchemaPanel, dispatch, editSchema, genericErrMsg, isChangeSchemaConfirmed, onSubmitSchema, schemaType, selectedInputSchema]);

  useEffect(() => {
    readCurrentSchemaOptions();
  }, [readCurrentSchemaOptions]);

  const onRenderFooterContent = useCallback(() => {
    let isNoNewSchemaSelected = true;

    if (uploadType === UploadSchemaTypes.SelectFrom) {
      if (schemaType === SchemaTypes.Input) {
        isNoNewSchemaSelected = !selectedInputSchema || selectedInputSchema.key === curDataMapOperation.inputSchema?.name;
      } else {
        isNoNewSchemaSelected = !selectedOutputSchema || selectedOutputSchema.key === curDataMapOperation.outputSchema?.name;
      }
    } else {
      isNoNewSchemaSelected = !selectedSchemaFile;
    }

    return (
      <div>
        {isChangeSchemaPanelOpen && (
          <PrimaryButton
            className="panel-button-left"
            onClick={addSchema}
            // TODO (danielle): Refactor below to be more clear
            disabled={isNoNewSchemaSelected}
          >
            {addMessage}
          </PrimaryButton>
        )}

        <DefaultButton onClick={hideEntirePanel}>{discardMessage}</DefaultButton>
      </div>
    );
  }, [
    isChangeSchemaPanelOpen,
    schemaType,
    curDataMapOperation,
    selectedInputSchema,
    selectedOutputSchema,
    addMessage,
    hideEntirePanel,
    discardMessage,
    addSchema,
    selectedSchemaFile,
    uploadType,
  ]);

  const onInputSchemaClick = () => {
    dispatch(openInputSchemaPanel());
  };
  const onOutputSchemaClick = () => {
    dispatch(openOutputSchemaPanel());
  };
  const onBackButtonClick = useCallback(() => {
    closeSchemaPanel();
  }, [closeSchemaPanel]);

  const onRenderNavigationContent: IRenderFunction<IPanelProps> = useCallback(
    (props, defaultRender) => (
      <div className="custom-navigation">
        {isDefaultPanelOpen && isChangeSchemaPanelOpen ? (
          <div>
            <IconButton iconProps={{ iconName: 'Back' }} title={backMessage} ariaLabel={backMessage} onClick={onBackButtonClick} />
            <Text className="back-header-text">{backMessage}</Text>
          </div>
        ) : isDefaultPanelOpen ? (
          <Text className="header-text">{configurationHeader}</Text>
        ) : isChangeSchemaPanelOpen ? (
          <Text className="header-text">{schemaType === SchemaTypes.Input ? addInputSchemaHeaderMsg : addOutputSchemaHeaderMsg}</Text>
        ) : (
          <div />
        )}
        {isDefaultPanelOpen !== isChangeSchemaPanelOpen && defaultRender?.(props)}
      </div>
    ),
    [
      addInputSchemaHeaderMsg,
      addOutputSchemaHeaderMsg,
      configurationHeader,
      isChangeSchemaPanelOpen,
      isDefaultPanelOpen,
      onBackButtonClick,
      schemaType,
      backMessage,
    ]
  );

  return (
    <div>
      <Panel
        className="config-panel"
        isLightDismiss
        isOpen={isDefaultPanelOpen || isChangeSchemaPanelOpen}
        onDismiss={hideEntirePanel}
        onRenderNavigationContent={onRenderNavigationContent}
        closeButtonAriaLabel={closeAriaLabel}
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <div>
          {isChangeSchemaPanelOpen ? (
            <ChangeSchemaView
              schemaType={schemaType}
              selectedSchema={schemaType === SchemaTypes.Input ? selectedInputSchema : selectedOutputSchema}
              setSelectedSchema={schemaType === SchemaTypes.Input ? setSelectedInputSchema : setSelectedOutputSchema}
              selectedSchemaFile={selectedSchemaFile}
              setSelectedSchemaFile={setSelectedSchemaFile}
              errorMessage={errorMessage}
              uploadType={uploadType}
              setUploadType={setUploadType}
            />
          ) : (
            <DefaultPanelView onInputSchemaClick={onInputSchemaClick} onOutputSchemaClick={onOutputSchemaClick} />
          )}
        </div>
      </Panel>
    </div>
  );
};
