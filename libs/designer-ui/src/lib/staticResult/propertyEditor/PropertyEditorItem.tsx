import constants from '../../constants';
import { Label } from '../../label';
import { StaticResultProperty } from '../staticResultProperty';
import { initializeCheckedDropdown, initializePropertyValueText } from '../util';
import { ItemMenuButton } from './ItemMenuButton';
import type { IButtonStyles, IContextualMenuItem, IContextualMenuProps, IContextualMenuStyles, ITextFieldStyles } from '@fluentui/react';
import { IconButton, TextField } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { clone } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo, useState } from 'react';

const dropwdownButtonStyles: Partial<IButtonStyles> = {
  root: {
    height: '26px',
    width: '26px',
    marginLeft: '20px',
  },
};

const dropdownMenuStyles: Partial<IContextualMenuStyles> = {
  root: {
    width: '150px',
    minWidth: '150px',
  },
};

const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { width: '100%', fontSize: 14, minHeight: 30 },
  wrapper: { width: '100%', alignItems: 'center', paddingBottom: 14 },
};

export const SchemaPropertyValueType = {
  STRING: 'string',
  OBJECT: 'schemaObject',
} as const;
export type SchemaPropertyValueType = (typeof SchemaPropertyValueType)[keyof typeof SchemaPropertyValueType];

interface BasePropertyEditorItemProps {
  schema?: OpenAPIV2.SchemaObject;
  propertyName: string;
  // current propertyEditor Properties
  currProperties: OpenAPIV2.SchemaObject;
  // update whole propertyEditor Properties
  deleteCurrPropertiesChild: () => void;
  // update only the child propertyEditor Properties
  updateCurrPropertiesChild: (newPropertyValue: any) => void;
  renameButtonClicked: (propertyName: string) => void;
  clearRename: () => void;
}

interface SchemaPropertyEditorValue {
  propertyValueType: 'OBJECT';
  propertyValue: OpenAPIV2.SchemaObject;
}
interface StringPropertyEditorValue {
  propertyValueType: 'STRING';
  propertyValue: string;
}

type PropertyEditorItemProps = BasePropertyEditorItemProps & (StringPropertyEditorValue | SchemaPropertyEditorValue);

export const PropertyEditorItem = ({
  schema,
  propertyName,
  propertyValue,
  propertyValueType,
  currProperties,
  renameButtonClicked,
  deleteCurrPropertiesChild,
  updateCurrPropertiesChild,
  clearRename,
}: PropertyEditorItemProps): JSX.Element => {
  const [checkedDropdownProperties, setCheckedDropdownProperties] = useState<Record<string, boolean>>(
    initializeCheckedDropdown(propertyValue, propertyValueType)
  );
  const [propertyValueText, setPropertyValueText] = useState<string>(initializePropertyValueText(propertyValue, propertyValueType));

  useEffect(() => {
    if (propertyValueType === SchemaPropertyValueType.OBJECT) {
      setCheckedDropdownProperties(initializeCheckedDropdown(propertyValue, propertyValueType));
    } else {
      setPropertyValueText(initializePropertyValueText(propertyValue, propertyValueType));
    }
  }, [propertyValue, propertyValueType]);

  const updateWithNewValue = () => {
    updateCurrPropertiesChild(propertyValueText ?? '');
  };

  // update the child propertyEditor Properties
  const updateCurrProperties = useCallback(
    (innerPropertyName: string, newPropertyValue: any) => {
      const updatedProperties = clone(currProperties[propertyName]);
      updatedProperties[innerPropertyName] = newPropertyValue;
      updateCurrPropertiesChild(updatedProperties);
    },
    [currProperties, propertyName, updateCurrPropertiesChild]
  );

  // delete the child propertyEditor Properties
  const deleteCurrPropertiesProperty = useCallback(
    (innerPropertyName: string) => {
      const updatedProperties = clone(currProperties[propertyName]);
      delete updatedProperties[innerPropertyName];
      updateCurrPropertiesChild(updatedProperties);
    },
    [currProperties, propertyName, updateCurrPropertiesChild]
  );

  const onToggleSelect = useCallback(
    (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item?: IContextualMenuItem): void => {
      ev && ev.preventDefault();
      if (item) {
        if (checkedDropdownProperties[item.key] === undefined || checkedDropdownProperties[item.key] === false) {
          updateCurrProperties(item.key, {});
        } else {
          deleteCurrPropertiesProperty(item.key);
        }
        setCheckedDropdownProperties({
          ...checkedDropdownProperties,
          [item.key]: checkedDropdownProperties[item.key] === undefined ? true : !checkedDropdownProperties[item.key],
        });
      }
    },
    [checkedDropdownProperties, deleteCurrPropertiesProperty, updateCurrProperties]
  );

  const convertSchemaPropertiestoMenuItems = useCallback(
    (properties: Record<string, OpenAPIV2.SchemaObject> | undefined): IContextualMenuItem[] => {
      const menuItems: IContextualMenuItem[] = [];
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          menuItems.push({
            key: key,
            text: value.title ?? key,
            data: value,
            canCheck: true,
            isChecked: checkedDropdownProperties[key],
            onClick: onToggleSelect,
          });
        });
      }
      return menuItems;
    },
    [checkedDropdownProperties, onToggleSelect]
  );
  const dropdownMenuProps: IContextualMenuProps = useMemo(
    () => ({
      shouldFocusOnMount: true,
      items: convertSchemaPropertiestoMenuItems(schema?.properties),
      styles: dropdownMenuStyles,
    }),
    [convertSchemaPropertiestoMenuItems, schema?.properties]
  );
  return (
    <div className="msla-property-editor-property" id={`property-${propertyName}`}>
      <div className="msla-property-editor-property-header">
        <div style={{ display: 'flex' }}>
          <Label className="msla-property-editor-property-name" text={propertyName} />
          {schema?.properties && propertyValue ? (
            <IconButton
              iconProps={{ iconName: 'Dropdown' }}
              styles={dropwdownButtonStyles}
              menuProps={dropdownMenuProps}
              onRenderMenuIcon={() => {
                return null;
              }}
            />
          ) : null}
        </div>
        <div className="msla-property-editor-property-options">
          <ItemMenuButton
            disabled={false}
            hideRename={!!schema}
            onDeleteClicked={() => {
              clearRename();
              deleteCurrPropertiesChild();
            }}
            onRenameClicked={() => {
              renameButtonClicked(propertyName);
            }}
          />
        </div>
      </div>
      {schema?.properties && propertyValue ? (
        <div style={{ marginLeft: '20px' }}>
          {Object.entries(propertyValue).map(([key, value], i) => {
            return (
              <div key={i}>
                {schema.properties ? (
                  <StaticResultProperty
                    key={value.toString()}
                    properties={value}
                    schema={
                      schema.properties[key].type === constants.SWAGGER.TYPE.OBJECT
                        ? { ...schema.properties[key], type: constants.SWAGGER.TYPE.STRING }
                        : schema.properties[key]
                    }
                    updateParentProperties={(newPropertyValue: any) => {
                      updateCurrProperties(key, newPropertyValue);
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <TextField
          styles={textFieldStyles}
          value={propertyValueText}
          onChange={(_e, newVal) => setPropertyValueText(newVal ?? '')}
          onBlur={() => updateWithNewValue()}
          multiline
          autoAdjustHeight
          resizable={false}
          rows={1}
        />
      )}
    </div>
  );
};
