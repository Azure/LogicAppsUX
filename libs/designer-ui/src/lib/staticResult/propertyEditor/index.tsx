import { PropertyEditorItem } from './PropertyEditorItem';
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
  schema?: OpenAPIV2.SchemaObject;
  updateProperties: (newProperties: Record<string, string>) => void;
}

export const PropertyEditor = ({ properties, schema, updateProperties }: PropertyEditorProps): JSX.Element => {
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
  const emptyPropertyName = intl.formatMessage({
    defaultMessage: 'Empty property name',
    description: 'Empty property name error message',
  });

  const clearRename = () => {
    setShowRenameCallout('');
    setRenamedValue('');
  };

  const renameButtonClicked = (propertyName: string) => {
    setShowRenameCallout(propertyName);
    setRenamedValue(propertyName);
  };

  const renameProperty = () => {
    const updatedProperties: Record<string, string> = {};
    // Have to iterate through object properties to maintain insertion order for string keys and can't use the following:
    // delete Object.assign(updatedProperties, currProperties, { [renamedValue]: currProperties[showRenameCallout] })[showRenameCallout];
    Object.keys(currProperties).forEach((key) => {
      key !== showRenameCallout ? (updatedProperties[key] = currProperties[key]) : (updatedProperties[renamedValue] = currProperties[key]);
    });
    setCurrProperties(updatedProperties);
  };

  const validateNewProperty = (s?: string) => {
    if (!s || (!currProperties[s] && typeof currProperties[s] !== 'string')) {
      setNewPropertyNameErrorMessage('');
    } else {
      setNewPropertyNameErrorMessage(duplicatePropertyName);
    }
  };

  const addNewProperty = () => {
    if (newPropertyNameErrorMessage) {
      return;
    }
    if (!newPropertyName || currProperties[newPropertyName]) {
      setNewPropertyNameErrorMessage(emptyPropertyName);
      return;
    }
    setCurrProperties({ ...currProperties, [newPropertyName]: '' });
    setNewPropertyName('');
  };

  const addNewPropertyWithSchema = () => {
    if (newPropertyNameErrorMessage) {
      return;
    }
    if (schema?.title) {
      setCurrProperties({ ...currProperties, [`${schema.title} - ${Object.keys(currProperties).length}`]: '' });
    }
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
    <div className="msla-property-editor-container">
      <div className="msla-property-editors">
        {Object.entries(currProperties).map(([propertyName, propertyValue], i) => {
          return (
            <PropertyEditorItem
              key={i}
              propertyName={propertyName}
              propertyValue={propertyValue}
              schema={schema}
              currProperties={currProperties}
              renameButtonClicked={renameButtonClicked}
              setCurrProperties={setCurrProperties}
              updateProperties={updateProperties}
              clearRename={clearRename}
            />
          );
        })}
        <div className="msla-property-editor-new-property">
          {!schema ? (
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
          ) : null}
          <DefaultButton
            className="msla-property-editor-add-new-property-button"
            iconProps={addItemButtonIconProps}
            text={addItemButtonLabel}
            onClick={() => (!schema ? addNewProperty() : addNewPropertyWithSchema())}
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
      </div>
    </div>
  );
};
