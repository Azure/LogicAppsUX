import type { ComboboxItem, ComplexArrayItems, DropdownItem, TokenPickerButtonEditorProps, ValueSegment } from '..';
import { Combobox, DropdownEditor, StringEditor } from '..';
import constants from '../constants';
import type { BasePlugins, ChangeState, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { ItemMenuButton } from './expandedsimplearray';
import { getBooleanDropdownOptions, getComoboxEnumOptions, hideComplexArray } from './util/util';
import type { ItemSchemaItemProps } from './util/util';
import type { IIconProps } from '@fluentui/react';
import { css, DefaultButton } from '@fluentui/react';
import { Label } from '../label';
import { guid } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

const addItemButtonIconProps: IIconProps = {
  iconName: 'Add',
};

export interface ExpandedComplexArrayProps {
  dimensionalSchema: ItemSchemaItemProps[];
  allItems: ComplexArrayItems[];
  canDeleteLastItem: boolean;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setItems: (newItems: ComplexArrayItems[]) => void;
  itemKey?: string;
  isNested?: boolean;
  options?: ComboboxItem[];
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  isDynamic?: boolean;
  basePlugins?: BasePlugins;
}

export const ExpandedComplexArray = ({
  dimensionalSchema,
  allItems,
  canDeleteLastItem,
  setItems,
  isNested = false,
  options,
  isDynamic,
  ...props
}: ExpandedComplexArrayProps): JSX.Element => {
  const intl = useIntl();

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
    id: 'JWl/LD',
    description: 'Label to add item to array editor',
  });

  const deleteItem = (index: number): void => {
    setItems(allItems.filter((_, i) => i !== index));
  };

  const handleArrayElementSaved = (newState: ChangeState, index: number, schemaItem: ItemSchemaItemProps) => {
    const key = schemaItem.key;
    const itemIndex = allItems[index].items.findIndex((item) => item.key === key);
    const newItems = [...allItems];
    // when we serialize, we dont populate with the dimensional schema, but instead with the items
    // therefore if we don't find the item, we need to add it
    if (itemIndex === -1) {
      newItems[index].items.push({
        key: schemaItem.key,
        title: schemaItem.title,
        description: schemaItem.description,
        value: newState.value,
      });
    } else {
      newItems[index].items[itemIndex].value = newState.value;
    }

    setItems(newItems);
  };

  const handleNestedArraySaved = (newComplexItems: ComplexArrayItems[], index: number, schemaItem: ItemSchemaItemProps) => {
    const key = schemaItem.key;
    const itemIndex = allItems[index].items.findIndex((item) => item.key === key);
    const newItems = [...allItems];
    if (itemIndex === -1) {
      newItems[index].items.push({
        key: schemaItem.key,
        title: schemaItem.title,
        description: schemaItem.description,
        value: [],
        arrayItems: newComplexItems,
      });
    } else {
      newItems[index].items[itemIndex].arrayItems = newComplexItems;
    }
    setItems(newItems);
  };

  const renderLabel = (index: number, schemaItem: ItemSchemaItemProps, isRequired?: boolean): JSX.Element => {
    const { title } = schemaItem;
    return (
      <div className="msla-array-editor-label">
        <Label isRequiredField={isRequired ?? false} text={`${title} - ${index + 1}`} />
      </div>
    );
  };

  return (
    <div className="msla-array-container msla-array-item-container">
      {allItems.map((item, index) => {
        return (
          <div key={item.key + index} className={css('msla-array-item', 'complex', isNested && 'isNested')}>
            {dimensionalSchema.map((schemaItem: ItemSchemaItemProps, i) => {
              const complexItem = item.items.find((complexItem) => complexItem.key === schemaItem.key);
              const comboboxOptions = getComoboxEnumOptions(options, schemaItem.enum);
              const dropdownOptions: DropdownItem[] | undefined =
                schemaItem.type === constants.SWAGGER.TYPE.BOOLEAN ? getBooleanDropdownOptions() : undefined;
              return (
                <div key={schemaItem.key + i}>
                  {schemaItem.type === constants.SWAGGER.TYPE.ARRAY && schemaItem.items && !hideComplexArray(schemaItem.items) ? (
                    <div>
                      <Label text={schemaItem.title} />
                      <ExpandedComplexArray
                        {...props}
                        dimensionalSchema={schemaItem.items}
                        allItems={complexItem?.arrayItems ?? ([] as ComplexArrayItems[])}
                        canDeleteLastItem={canDeleteLastItem}
                        setItems={(newItems) => {
                          handleNestedArraySaved(newItems, index, schemaItem);
                        }}
                        isNested={true}
                        itemKey={guid()}
                      />
                    </div>
                  ) : (
                    <>
                      {
                        // hide empty readonly editors
                        schemaItem?.readOnly && (!complexItem || complexItem.value.length === 0) ? null : (
                          <>
                            <div className="msla-array-item-header">
                              {renderLabel(index, schemaItem, schemaItem?.isRequired)}
                              {i === 0 ? (
                                <div className="msla-array-item-commands">
                                  <ItemMenuButton
                                    disabled={!!props.readonly}
                                    itemKey={index}
                                    visible={canDeleteLastItem || allItems.length > 1}
                                    onDeleteItem={(index) => deleteItem(index)}
                                  />
                                </div>
                              ) : null}
                            </div>
                            {isDynamic || (comboboxOptions ?? []).length > 0 ? (
                              <Combobox
                                {...props}
                                valueType={schemaItem?.type}
                                options={comboboxOptions ?? []}
                                placeholder={schemaItem.description}
                                initialValue={complexItem?.value ?? []}
                                onChange={(newState) => handleArrayElementSaved(newState, index, schemaItem)}
                              />
                            ) : dropdownOptions ? (
                              <DropdownEditor
                                {...props}
                                options={dropdownOptions}
                                initialValue={complexItem?.value ?? []}
                                onChange={(newState) => handleArrayElementSaved(newState, index, schemaItem)}
                              />
                            ) : (
                              <StringEditor
                                {...props}
                                readonly={schemaItem?.readOnly}
                                valueType={schemaItem?.type}
                                className="msla-array-editor-container-expanded"
                                initialValue={complexItem?.value ?? []}
                                editorBlur={(newState) => handleArrayElementSaved(newState, index, schemaItem)}
                                placeholder={schemaItem?.description}
                              />
                            )}
                          </>
                        )
                      }
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="msla-array-toolbar">
        <DefaultButton
          disabled={props.readonly}
          className="msla-array-add-item-button"
          iconProps={addItemButtonIconProps}
          text={addItemButtonLabel}
          onClick={() => {
            setItems([
              ...allItems,
              {
                key: guid(),
                items: dimensionalSchema.map((item) => {
                  return { key: item.key, title: item.title, value: [], description: item.description };
                }),
              },
            ]);
          }}
        />
      </div>
    </div>
  );
};
