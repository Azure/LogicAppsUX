import { openChangeInputWarning, openChangeOutputWarning } from '../../core/state/ModalSlice';
import { closeDefaultConfigPanel, closeSchemaChangePanel, openInputSchemaPanel, openOutputSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { Schema } from '../../models';
import { ChangeSchemaView } from './ChangeSchemaView';
import { DefaultPanelView } from './DefaultPanelView';
import type { IDropdownOption, IPanelProps, IRenderFunction } from '@fluentui/react';
import { DefaultButton, IconButton, Panel, PrimaryButton, Text } from '@fluentui/react';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export enum SchemaTypes {
  Input = 'input',
  Output = 'output',
}

export interface EditorConfigPanelProps {
  onSubmitInputSchema: (schema: Schema) => void;
  onSubmitOutputSchema: (schema: Schema) => void;
}

export const EditorConfigPanel: FunctionComponent<EditorConfigPanelProps> = ({ onSubmitInputSchema, onSubmitOutputSchema }) => {
  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.curDataMapOperation);
  const isDefaultPanelOpen = useSelector((state: RootState) => state.panel.isDefaultConfigPanelOpen);
  const isChangeSchemaPanelOpen = useSelector((state: RootState) => state.panel.isChangeSchemaPanelOpen);
  const schemaType = useSelector((state: RootState) => state.panel.schemaType);
  const [selectedInputSchema, setSelectedInputSchema] = useState<IDropdownOption>();
  const [selectedOutputSchema, setSelectedOutputSchema] = useState<IDropdownOption>();
  const [errorMessage, setErrorMessage] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

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

  const hideEntirePanel = useCallback(() => {
    dispatch(closeDefaultConfigPanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const closeSchemaPanel = useCallback(() => {
    dispatch(closeSchemaChangePanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const editInputSchema = useCallback(() => {
    setErrorMessage('');
    if (selectedInputSchema) {
      onSubmitInputSchema(selectedInputSchema.data);
      closeSchemaPanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [closeSchemaPanel, onSubmitInputSchema, selectedInputSchema, genericErrMsg]);

  const editOutputSchema = useCallback(() => {
    setErrorMessage('');
    if (selectedOutputSchema) {
      onSubmitOutputSchema(selectedOutputSchema.data);
      closeSchemaPanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [closeSchemaPanel, onSubmitOutputSchema, selectedOutputSchema, genericErrMsg]);

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        {isChangeSchemaPanelOpen && (
          <PrimaryButton
            className="panel-button-left"
            onClick={
              schemaType === SchemaTypes.Input
                ? curDataMapOperation
                  ? () => dispatch(openChangeInputWarning(editInputSchema))
                  : editInputSchema
                : curDataMapOperation
                ? () => dispatch(openChangeOutputWarning(editOutputSchema))
                : editOutputSchema
            }
            disabled={schemaType === SchemaTypes.Input ? !selectedInputSchema : !selectedOutputSchema}
          >
            {addMessage}
          </PrimaryButton>
        )}

        <DefaultButton onClick={hideEntirePanel}>{discardMessage}</DefaultButton>
      </div>
    ),
    [
      isChangeSchemaPanelOpen,
      schemaType,
      curDataMapOperation,
      editInputSchema,
      editOutputSchema,
      selectedInputSchema,
      selectedOutputSchema,
      addMessage,
      hideEntirePanel,
      discardMessage,
      dispatch,
    ]
  );

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
              errorMessage={errorMessage}
            />
          ) : (
            <DefaultPanelView onInputSchemaClick={onInputSchemaClick} onOutputSchemaClick={onOutputSchemaClick} />
          )}
        </div>
      </Panel>
    </div>
  );
};
