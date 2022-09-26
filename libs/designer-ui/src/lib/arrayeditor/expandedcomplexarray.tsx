import type { ComplexArrayItem } from '..';
import { BaseEditor } from '../editor/base';
import type { LabelProps } from '../label';
import { ItemMenuButton, renderLabel } from './expandedsimplearray';
import { EditorChangeComplex } from './plugins/EditorChangeComplex';
import type { IIconProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { guid } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

const addItemButtonIconProps: IIconProps = {
  iconName: 'Add',
};

export interface ExpandedComplexArrayProps {
  itemSchema: string[];
  labelProps: LabelProps;
  items: ComplexArrayItem[];
  canDeleteLastItem: boolean;
  readOnly?: boolean;
  isTrigger?: boolean;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  setItems: (newItems: ComplexArrayItem[]) => void;
}

export const ExpandedComplexArray = ({
  itemSchema,
  labelProps,
  items,
  canDeleteLastItem,
  readOnly,
  isTrigger,
  GetTokenPicker,
  setItems,
}: ExpandedComplexArrayProps): JSX.Element => {
  const intl = useIntl();

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
    description: 'Label to add item to array editor',
  });

  const deleteItem = (index: number): void => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="msla-array-container msla-array-item-container">
      {items.map((item, index) => {
        return (
          <div key={index} className="msla-array-item">
            {item.value.map((complexItems, i) => {
              return (
                <div key={item.key + i}>
                  <div className="msla-array-item-header">
                    {renderLabel(index, labelProps, itemSchema[i])}
                    {i === 0 ? (
                      <div className="msla-array-item-commands">
                        <ItemMenuButton
                          disabled={!!readOnly}
                          itemKey={index}
                          visible={canDeleteLastItem || items.length > 1}
                          onDeleteItem={(index) => deleteItem(index)}
                        />
                      </div>
                    ) : null}
                  </div>
                  <BaseEditor
                    className="msla-array-editor-container-expanded"
                    initialValue={complexItems ?? []}
                    BasePlugins={{ tokens: true, clearEditor: true }}
                    isTrigger={isTrigger}
                    tokenPickerButtonProps={{ buttonClassName: 'msla-editor-tokenpicker-button' }}
                    GetTokenPicker={GetTokenPicker}
                  >
                    <EditorChangeComplex item={complexItems ?? []} items={items} setItems={setItems} index={index} innerIndex={i} />
                  </BaseEditor>
                </div>
              );
            })}
          </div>
        );
      })}
      <div className="msla-array-toolbar">
        <DefaultButton
          className="msla-array-add-item-button"
          iconProps={addItemButtonIconProps}
          text={addItemButtonLabel}
          onClick={() => setItems([...items, { value: Array.from(Array(itemSchema.length), () => []), key: guid() }])}
        />
      </div>
    </div>
  );
};
