import { PropertyEditorItem, SchemaPropertyValueType } from './PropertyEditorItem';
import type { IButtonStyles, IIconProps, ITextFieldStyles } from '@fluentui/react';
import { DefaultButton, PrimaryButton, Callout, DirectionalHint, TextField } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { clone } from '@microsoft/logic-apps-shared';
import { useUpdateEffect } from '@react-hookz/web';
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
  properties: OpenAPIV2.SchemaObject;
  schema?: OpenAPIV2.SchemaObject;
  title?: string;
  updateProperties: (newProperties: OpenAPIV2.SchemaObject) => void;
}

export const PropertyEditor = ({ properties, title, schema, updateProperties }: PropertyEditorProps): JSX.Element => {
  const intl = useIntl();
  const [currProperties, setCurrProperties] = useState<OpenAPIV2.SchemaObject>(properties);
  const [showRenameCallout, setShowRenameCallout] = useState('');
  const [renamedValue, setRenamedValue] = useState('');
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyNameErrorMessage, setNewPropertyNameErrorMessage] = useState('');

  useUpdateEffect(() => {
    updateProperties(currProperties);
  }, [currProperties]);

  const duplicatePropertyName = intl.formatMessage({
    defaultMessage: 'Duplicate property name',
    id: 'ms90148b7ee89d',
    description: 'Duplicate property name error message',
  });
  const emptyPropertyName = intl.formatMessage({
    defaultMessage: 'Empty property name',
    id: 'ms99e56407a0b9',
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
    setCurrProperties({ ...currProperties, [`${schema?.title ?? title} - ${Object.keys(currProperties).length}`]: {} });
  };

  const updateCurrPropertiesChild = (propertyName: string, newPropertyValue: any) => {
    const updatedProperties = clone(currProperties);
    updatedProperties[propertyName] = newPropertyValue;
    setCurrProperties(updatedProperties);
  };

  const deleteCurrPropertiesChild = (propertyName: string) => {
    const updatedProperties = clone(currProperties);
    delete updatedProperties[propertyName];
    // reindex current Properties
    if (schema) {
      const renamedProperties: OpenAPIV2.SchemaObject = {};
      Object.entries(updatedProperties).forEach(([, propertyValue], i) => {
        renamedProperties[`${schema.title} - ${i}`] = propertyValue;
      });
      setCurrProperties(renamedProperties);
    } else {
      setCurrProperties(updatedProperties);
    }
  };

  const saveButtonLabel = intl.formatMessage({
    defaultMessage: 'Save',
    id: 'msdb2db86bf9e2',
    description: 'Save button label',
  });

  const cancelButtonLabel = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'msd064f4488113',
    description: 'Cancel button label',
  });

  const newPropertyPlaceholderText = intl.formatMessage({
    defaultMessage: 'Enter unique property name',
    id: 'ms356c4658d85c',
    description: 'Placeholder text for new property name',
  });

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
    id: 'ms662f6040ae04',
    description: 'Label to add item to property editor',
  });

  // todo: move currProperties to a Map so it keeps insertion order
  // right now if we set a propertyName to a number it will add it to the top of this list
  return (
    <div className="msla-property-editor-container">
      <div className="msla-property-editors">
        {Object.entries(currProperties).map(([propertyName, propertyValue], i) => {
          return (
            <PropertyEditorItem
              key={i}
              propertyName={propertyName}
              propertyValue={propertyValue}
              propertyValueType={typeof propertyValue === 'string' ? SchemaPropertyValueType.STRING : SchemaPropertyValueType.OBJECT}
              schema={schema}
              currProperties={currProperties}
              renameButtonClicked={renameButtonClicked}
              deleteCurrPropertiesChild={() => deleteCurrPropertiesChild(propertyName)}
              updateCurrPropertiesChild={(newPropertyValue: any) => updateCurrPropertiesChild(propertyName, newPropertyValue)}
              clearRename={clearRename}
            />
          );
        })}
        <div className="msla-property-editor-new-property">
          {schema ? null : (
            <TextField
              styles={newPropertyTextFieldStyles}
              placeholder={newPropertyPlaceholderText}
              value={newPropertyName}
              onChange={(_e, newValue) => {
                setNewPropertyName(newValue ?? '');
                validateNewProperty(newValue);
              }}
              errorMessage={newPropertyNameErrorMessage}
            />
          )}
          <DefaultButton
            className="msla-property-editor-add-new-property-button"
            iconProps={addItemButtonIconProps}
            text={addItemButtonLabel}
            onClick={() => {
              schema ? addNewPropertyWithSchema() : addNewProperty();
            }}
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
