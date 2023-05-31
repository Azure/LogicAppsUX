import type { ComplexArrayItems, TokenPickerButtonEditorProps, ValueSegment } from '..';
import { StringEditor } from '..';
import constants from '../constants';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import { notEqual } from '../editor/base/utils/helper';
import { ItemMenuButton, renderLabel } from './expandedsimplearray';
import type { ItemSchemaItemProps } from './util/util';
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

  const handleArrayElementSaved = (prevVal: ValueSegment[], newState: ChangeState, index: number, innerIndex: number) => {
    if (notEqual(prevVal, newState.value)) {
      const newItems = [...allItems];
      newItems[index].items[innerIndex].value = newState.value;
      setItems(newItems);
    }
  };

  const handleNestedArraySaved = (
    newComplexItems: ComplexArrayItems[],
    index: number,
    innerIndex: number,
    schemaItem: ItemSchemaItemProps
  ) => {
    const newItems = [...allItems];
    if (allItems[index].items[innerIndex].key !== schemaItem.key) {
      const slicedArray = allItems[index].items;
      newItems[index].items = [
        ...slicedArray.slice(0, innerIndex),
        { key: schemaItem.key, title: schemaItem.title, description: schemaItem.description, value: [] },
        ...slicedArray.slice(innerIndex),
      ];
    }
    newItems[index].items[innerIndex].arrayItems = newComplexItems;
    setItems(JSON.parse(JSON.stringify(newItems)));
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
                  {schemaItem.type === constants.SWAGGER.TYPE.ARRAY && schemaItem.items ? (
                    <div>
                      <Label> {schemaItem.title} </Label>
                      <ExpandedComplexArray
                        {...props}
                        dimensionalSchema={schemaItem.items}
                        allItems={complexItem?.arrayItems ?? ([] as ComplexArrayItems[])}
                        canDeleteLastItem={canDeleteLastItem}
                        setItems={(newItems) => {
                          handleNestedArraySaved(newItems, index, i, schemaItem);
                        }}
                        isNested={true}
                        itemKey={guid()}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="msla-array-item-header">
                        {renderLabel(index, schemaItem?.title, schemaItem?.isRequired)}
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
                      <StringEditor
                        {...props}
                        valueType={schemaItem?.type}
                        className="msla-array-editor-container-expanded"
                        initialValue={complexItem?.value ?? []}
                        editorBlur={(newState) => handleArrayElementSaved(complexItem?.value ?? [], newState, index, i)}
                        placeholder={complexItem?.description}
                      />
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
