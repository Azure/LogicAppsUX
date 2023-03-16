import { Label } from '../../label';
import { textFieldStyles } from '../staticResultProperty';
import { ItemMenuButton } from './ItemMenuButton';
import type { IButtonStyles, IIconProps, ITextFieldStyles } from '@fluentui/react';
import { DefaultButton, PrimaryButton, Callout, DirectionalHint, TextField } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const directionalHint = DirectionalHint.leftCenter;

const addItemButtonIconProps: IIconProps = {
  iconName: 'Add',
};

const calloutTextFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { height: 30, width: '100%', fontSize: 14 },
  wrapper: { width: '100%', maxHeight: 40, alignItems: 'center' },
};

const newPropertyTextFieldStyles: Partial<ITextFieldStyles> = {
  root: { width: '50%', paddingTop: '10px' },
  fieldGroup: { height: 30, width: '100%', fontSize: 14 },
  wrapper: { width: '100%', maxHeight: 40, alignItems: 'center' },
};

const saveButtonStyles: Partial<IButtonStyles> = {
  root: {
    float: 'left',
    marginTop: '10px',
    width: '60px',
    minWidth: '60px',
  },
};
const cancelButtonStyles: Partial<IButtonStyles> = {
  root: {
    float: 'right',
    marginTop: '10px',
    width: '60px',
    minWidth: '60px',
  },
};

interface PropertyEditorProps {
  properties: Record<string, string>;
  updateProperties: (newProperties: Record<string, string>) => void;
}

export const PropertyEditor = ({ properties, updateProperties }: PropertyEditorProps): JSX.Element => {
  const intl = useIntl();
  const [currProperties, setCurrProperties] = useState<Record<string, string>>(properties);
  const [showRenameCallout, setShowRenameCallout] = useState('');
  const [renamedValue, setRenamedValue] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyNameErrorMessage, setNewPropertyNameErrorMessage] = useState('');

  const duplicatePropertyName = intl.formatMessage({
    defaultMessage: 'Duplicate property name',
    description: 'Duplicate property name error message',
  });

  const updateText = (propertyName: string, newValue?: string) => {
    const updatedProperties = { ...currProperties };
    updatedProperties[propertyName] = newValue ?? '';
    setCurrProperties(updatedProperties);
  };

  const deleteItem = (propertyName: string) => {
    const updatedProperties = { ...currProperties };
    delete updatedProperties[propertyName];
    setCurrProperties(updatedProperties);
  };

  const clearRename = () => {
    setShowRenameCallout('');
    setRenamedValue('');
  };

  const renameProperty = () => {
    const updatedProperties = {};
    delete Object.assign(updatedProperties, currProperties, { [renamedValue]: currProperties[showRenameCallout] })[showRenameCallout];
    setCurrProperties(updatedProperties);
  };

  const validateNewProperty = (s?: string) => {
    if (!s || !currProperties[s]) {
      setNewPropertyNameErrorMessage('');
    } else {
      setNewPropertyNameErrorMessage(duplicatePropertyName);
    }
  };

  const addNewProperty = () => {
    if (!newPropertyName || currProperties[newPropertyName]) return;
    const updatedProperties = { ...currProperties };
    updatedProperties[newPropertyName] = '';
    setCurrProperties(updatedProperties);
    setNewPropertyName('');
  };

  const saveButtonLabel = intl.formatMessage({
    defaultMessage: 'Save',
    description: 'Save button label',
  });

  const cancelButtonLabel = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel button label',
  });

  const newPropertyPlaceholderText = intl.formatMessage({
    defaultMessage: 'Enter unique property name',
    description: 'Placeholder text for new property name',
  });
  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
    description: 'Label to add item to property editor',
  });

  return (
    <>
      {Object.entries(currProperties).map(([propertyName, propertyValue], i) => {
        return (
          <div key={i} className="msla-property-editor-property" id={`property-${propertyName}`}>
            <div className="msla-property-editor-property-header">
              <Label className="msla-property-editor-property-name" text={propertyName} />
              <div className="msla-property-editor-property-options">
                <ItemMenuButton
                  disabled={false}
                  onDeleteClicked={() => {
                    clearRename();
                    deleteItem(propertyName);
                  }}
                  onRenameClicked={() => {
                    setShowRenameCallout(propertyName);
                    setRenamedValue(propertyName);
                  }}
                />
              </div>
            </div>
            <TextField
              styles={textFieldStyles}
              value={propertyValue}
              onChange={(_e, newVal) => updateText(propertyName, newVal)}
              onBlur={() => updateProperties(currProperties)}
            />
          </div>
        );
      })}
      <div className="msla-property-editor-new-property">
        <TextField
          styles={newPropertyTextFieldStyles}
          placeholder={newPropertyPlaceholderText}
          onChange={(_e, newValue) => {
            setNewPropertyName(newValue ?? '');
            validateNewProperty(newValue);
          }}
          errorMessage={newPropertyNameErrorMessage}
          value={newPropertyName}
        />
        <DefaultButton
          className="msla-property-editor-add-new-property-button"
          iconProps={addItemButtonIconProps}
          text={addItemButtonLabel}
          onClick={() => addNewProperty()}
        />
      </div>
      {showRenameCallout ? (
        <Callout
          style={{ padding: '10px' }}
          setInitialFocus={true}
          directionalHint={directionalHint}
          target={`#property-${showRenameCallout}`}
          onDismiss={clearRename}
        >
          <TextField value={renamedValue} styles={calloutTextFieldStyles} onChange={(_, newValue) => setRenamedValue(newValue ?? '')} />
          <PrimaryButton styles={cancelButtonStyles} text={cancelButtonLabel} ariaLabel={saveButtonLabel} onClick={clearRename} />
          <PrimaryButton
            styles={saveButtonStyles}
            text={saveButtonLabel}
            ariaLabel={saveButtonLabel}
            onClick={() => {
              renameProperty();
              clearRename();
            }}
          />
        </Callout>
      ) : null}
    </>
  );
};
