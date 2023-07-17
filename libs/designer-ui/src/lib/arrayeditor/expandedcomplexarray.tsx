import type { ComboboxItem, ComplexArrayItems, TokenPickerButtonEditorProps } from '..';
import { Combobox, StringEditor } from '..';
import constants from '../constants';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import { ItemMenuButton } from './expandedsimplearray';
import { hideComplexArray, type ItemSchemaItemProps } from './util/util';
import type { IIconProps } from '@fluentui/react';
import { Label, css, DefaultButton } from '@fluentui/react';
import { guid } from '@microsoft/utils-logic-apps';
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
  getTokenPicker: GetTokenPickerHandler;
  setItems: (newItems: ComplexArrayItems[]) => void;
  itemKey?: string;
  isNested?: boolean;
}

export const ExpandedComplexArray = ({
  dimensionalSchema,
  allItems,
  canDeleteLastItem,
  setItems,
  isNested = false,
  ...props
}: ExpandedComplexArrayProps): JSX.Element => {
  const intl = useIntl();

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
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
        <Label required={isRequired ?? false}> {title + ' - ' + (index + 1)}</Label>
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
              return (
                <div key={complexItem?.arrayItems?.length ?? ' ' + i}>
                  {schemaItem.type === constants.SWAGGER.TYPE.ARRAY && schemaItem.items && !hideComplexArray(schemaItem.items) ? (
                    <div>
                      <Label> {schemaItem.title} </Label>
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
                            {schemaItem.enum && schemaItem.enum.length > 0 ? (
                              <Combobox
                                {...props}
                                options={schemaItem.enum.map(
                                  (val: string): ComboboxItem => ({
                                    displayName: val,
                                    key: val,
                                    value: val,
                                  })
                                )}
                                placeholder={schemaItem.description}
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
