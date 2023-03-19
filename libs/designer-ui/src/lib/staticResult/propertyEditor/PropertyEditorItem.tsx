import constants from '../../constants';
import { Label } from '../../label';
import { StaticResultProperty } from '../staticResultProperty';
import { ItemMenuButton } from './ItemMenuButton';
import type { IButtonStyles, IContextualMenuItem, IContextualMenuProps, IContextualMenuStyles, ITextFieldStyles } from '@fluentui/react';
import { IconButton, TextField } from '@fluentui/react';
import { useCallback, useMemo, useState } from 'react';

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
  fieldGroup: { height: 30, width: '100%', fontSize: 14 },
  wrapper: { width: '100%', maxHeight: 40, alignItems: 'center' },
};

interface PropertyEditorItemProps {
  schema?: OpenAPIV2.SchemaObject;
  propertyName: string;
  propertyValue: string;
  // current propertyEditor Properties
  currProperties: Record<string, string>;
  setCurrProperties: (newProperties: Record<string, string>) => void;
  renameButtonClicked: (propertyName: string) => void;
  clearRename: () => void;
  // update main propertyEditor Properties
  updateProperties: (newProperties: Record<string, string>) => void;
}

export const PropertyEditorItem = ({
  schema,
  propertyName,
  propertyValue,
  currProperties,
  renameButtonClicked,
  setCurrProperties,
  clearRename,
  updateProperties,
}: PropertyEditorItemProps): JSX.Element => {
  const [checkedDropdownProperties, setCheckedDropdownProperties] = useState<Record<string, boolean>>({});

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

  const onToggleSelect = useCallback(
    (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item?: IContextualMenuItem): void => {
      ev && ev.preventDefault();
      if (item) {
        setCheckedDropdownProperties({
          ...checkedDropdownProperties,
          [item.key]: checkedDropdownProperties[item.key] === undefined ? true : !checkedDropdownProperties[item.key],
        });
      }
    },
    [checkedDropdownProperties]
  );
  const convertSchemaPropertiestoMenuItems = useCallback(
    (properties: Record<string, OpenAPIV2.SchemaObject> | undefined): IContextualMenuItem[] => {
      const menuItems: IContextualMenuItem[] = [];
      if (properties) {
        Object.keys(properties).forEach((property) => {
          menuItems.push({
            key: property,
            text: property,
            data: properties[property],
            canCheck: true,
            isChecked: checkedDropdownProperties[property],
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
          {schema && schema.properties ? (
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
              deleteItem(propertyName);
            }}
            onRenameClicked={() => {
              renameButtonClicked(propertyName);
            }}
          />
        </div>
      </div>
      {schema && schema.properties ? (
        <div style={{ marginLeft: '20px' }}>
          {Object.entries(schema.properties).map(([propertyName, propertyValue], dropdownIndex) => {
            if (checkedDropdownProperties[propertyName]) {
              return (
                <div key={dropdownIndex}>
                  <StaticResultProperty
                    schema={
                      propertyValue.type === constants.SWAGGER.TYPE.OBJECT
                        ? { ...propertyValue, type: constants.SWAGGER.TYPE.STRING }
                        : propertyValue
                    }
                  />
                </div>
              );
            }
            return null;
          })}
        </div>
      ) : (
        <TextField
          styles={textFieldStyles}
          value={propertyValue}
          onChange={(_e, newVal) => updateText(propertyName, newVal)}
          onBlur={() => updateProperties(currProperties)}
        />
      )}
    </div>
  );
};
