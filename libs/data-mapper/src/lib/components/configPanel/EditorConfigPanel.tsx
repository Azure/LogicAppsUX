import { closeDefaultConfigPanel, closeSchemaChangePanel, openInputSchemaPanel, openOutputSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { Schema } from '../../models';
import { ChangeSchemaView } from './ChangeSchemaView';
import { DefaultPanelView } from './DefaultPanelView';
import type { IDropdownOption, IPanelProps, IRenderFunction } from '@fluentui/react';
import { DefaultButton, IconButton, initializeIcons, Panel, PrimaryButton, Text } from '@fluentui/react';
// import { PanelContent } from 'libs/designer-ui/src/lib/panel/panelcontent';
// import { PanelPivot } from 'libs/designer-ui/src/lib/panel/panelpivot';
// import type { IChoiceGroupOption, IDropdownOption } from '@fluentui/react';
// import { useBoolean } from '@fluentui/react-hooks';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
// import { RootState } from '../../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';

export enum SchemaTypes {
  Input = 'input',
  Output = 'output',
}

export enum UploadSchemaTypes {
  UploadNew = 'upload-new',
  SelectFrom = 'select-from',
}

export interface EditorConfigPanelProps {
  schemaType?: SchemaTypes;
  onSubmitInputSchema: (schema: Schema) => void;
  onSubmitOutputSchema: (schema: Schema) => void;
  schemaFilesList?: Schema[] | undefined;
}

initializeIcons();

export const EditorConfigPanel: FunctionComponent<EditorConfigPanelProps> = ({
  onSubmitInputSchema,
  onSubmitOutputSchema,
  schemaFilesList,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isDefaultPanelOpen = useSelector((state: RootState) => state.panel.isDefaultConfigPanelOpen);
  const isChangeSchemaPanelOpen = useSelector((state: RootState) => state.panel.isChangeSchemaPanelOpen);
  const schemaType = useSelector((state: RootState) => state.panel.schemaType);

  const hideEntirePanel = () => {
    dispatch(closeDefaultConfigPanel());
    setErrorMessage('');
  };
  const closeSchemaPanel = () => {
    dispatch(closeSchemaChangePanel());
    setErrorMessage('');
  };

  const [selectedInputSchema, setSelectedInputSchema] = useState<IDropdownOption>();
  const [selectedOutputSchema, setSelectedOutputSchema] = useState<IDropdownOption>();
  const [errorMessage, setErrorMessage] = useState('');

  const intl = useIntl();

  const addMessage = intl.formatMessage({
    defaultMessage: 'Add',
    description: 'Button text for Add to add the selected schema file to use',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button text for Cancel to cancel the schema selection.',
  });
  const configurationHeader = intl.formatMessage({
    defaultMessage: 'Configuration',
    description: 'Header text to inform users this panel is for configuration.',
  });
  const genericErrMsg = intl.formatMessage({
    defaultMessage: 'Failed loading the schema. Please try again.',
    description: 'error message for loading the schema',
  });

  const onInputSchemaAddClick = useCallback(() => {
    setErrorMessage('');
    if (selectedInputSchema) {
      onSubmitInputSchema(selectedInputSchema.data);
      closeSchemaPanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [closeSchemaPanel, onSubmitInputSchema, selectedInputSchema]);

  const onOutputSchemaAddClick = useCallback(() => {
    setErrorMessage('');
    if (selectedOutputSchema) {
      onSubmitOutputSchema(selectedOutputSchema.data);
      closeSchemaPanel();
    } else {
      setErrorMessage(genericErrMsg);
    }
  }, [closeSchemaPanel, onSubmitOutputSchema, selectedOutputSchema]);

  const onRenderFooterContent = useCallback(
    () => (
      <div>
        {isChangeSchemaPanelOpen && (
          <PrimaryButton
            onClick={schemaType === SchemaTypes.Input ? onInputSchemaAddClick : onOutputSchemaAddClick}
            disabled={schemaType === SchemaTypes.Input ? !selectedInputSchema : !selectedOutputSchema}
            styles={{ root: { marginRight: 8 } }}
          >
            {addMessage}
          </PrimaryButton>
        )}

        <DefaultButton onClick={hideEntirePanel}>{cancelMessage}</DefaultButton>
      </div>
    ),
    [hideEntirePanel, addMessage, cancelMessage]
  );

  const onInputSchemaClick = () => {
    dispatch(openInputSchemaPanel());
  };
  const onOutputSchemaClick = () => {
    dispatch(openOutputSchemaPanel());
  };
  const onBackButtonClick = () => {
    closeSchemaPanel();
  };

  const onRenderNavigationContent: IRenderFunction<IPanelProps> = useCallback(
    (props, defaultRender) => (
      <div className="custom-navigation">
        {isDefaultPanelOpen && isChangeSchemaPanelOpen ? (
          <div>
            <IconButton iconProps={{ iconName: 'Back' }} title="back" ariaLabel="back" onClick={onBackButtonClick} />
            Back
          </div>
        ) : isDefaultPanelOpen ? (
          <Text className="header-text">{configurationHeader}</Text>
        ) : isChangeSchemaPanelOpen ? (
          <Text className="header-text">{'Add ... schema'}</Text>
        ) : (
          <></>
        )}
        {isDefaultPanelOpen !== isChangeSchemaPanelOpen && defaultRender!(props)}
      </div>
    ),
    [configurationHeader, isChangeSchemaPanelOpen, isDefaultPanelOpen, onBackButtonClick]
  );

  return (
    <div>
      <Panel
        className="config-panel"
        isLightDismiss
        isOpen={isDefaultPanelOpen || isChangeSchemaPanelOpen}
        onDismiss={hideEntirePanel}
        onRenderNavigationContent={onRenderNavigationContent}
        closeButtonAriaLabel="Close"
        onRenderFooterContent={onRenderFooterContent}
        isFooterAtBottom={true}
      >
        <div>
          {isChangeSchemaPanelOpen ? (
            <ChangeSchemaView
              schemaType={schemaType}
              schemaFilesList={schemaFilesList}
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
