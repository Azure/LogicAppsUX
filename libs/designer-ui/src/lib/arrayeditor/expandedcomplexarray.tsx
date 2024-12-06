import type { ComboboxItem, ComplexArrayItems, DropdownItem, TokenPickerButtonEditorProps, ValueSegment } from '..';
import { Combobox, DropdownEditor, StringEditor } from '..';
import constants from '../constants';
import type { ChangeState, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { getBooleanDropdownOptions, getComoboxEnumOptions, hideComplexArray } from './util/util';
import type { ItemSchemaItemProps } from './util/util';
import { css } from '@fluentui/react';
import { Label } from '../label';
import { guid } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { Button, Badge } from '@fluentui/react-components';
import { RemoveItemButton } from './removeitembutton';

import { bundleIcon, AddSquareFilled, AddSquareRegular } from '@fluentui/react-icons';

const AddIcon = bundleIcon(AddSquareFilled, AddSquareRegular);

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
}

export const ExpandedComplexArray = ({
  dimensionalSchema,
  allItems,
  canDeleteLastItem,
  setItems,
  isNested = false,
  options,
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
                            <Badge className="msla-array-index" shape="rounded" appearance="tint">
                              {index + 1}
                            </Badge>
                            {comboboxOptions ? (
                              <Combobox
                                {...props}
                                valueType={schemaItem?.type}
                                options={comboboxOptions}
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
                            {i === 0 ? (
                              <RemoveItemButton
                                disabled={!!props.readonly}
                                itemKey={index}
                                visible={canDeleteLastItem || allItems.length > 1}
                                onClick={(index) => deleteItem(index)}
                              />
                            ) : null}
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
        <Button
          disabled={props.readonly}
          icon={<AddIcon />}
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
          style={{ paddingLeft: '1px', gap: '2px' }}
        >
          {addItemButtonLabel}
        </Button>
      </div>
    </div>
  );
};
