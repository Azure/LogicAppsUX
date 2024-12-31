import type { ComboboxItem, SimpleArrayItem, TokenPickerButtonEditorProps, ValueSegment } from '..';
import { Combobox, StringEditor } from '..';
import type { ChangeState, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { notEqual } from '../editor/base/utils/helper';
import type { LabelProps } from '../label';
import { Button, Badge } from '@fluentui/react-components';
import { guid } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { getComoboxEnumOptions } from './util/util';
import { RemoveItemButton } from './removeitembutton';

import { bundleIcon, AddSquareFilled, AddSquareRegular } from '@fluentui/react-icons';

const AddIcon = bundleIcon(AddSquareFilled, AddSquareRegular);

export interface ExpandedSimpleArrayProps {
  labelProps: LabelProps;
  items: SimpleArrayItem[];
  canDeleteLastItem: boolean;
  placeholder?: string;
  valueType?: string;
  itemEnum?: string[];
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setItems: (newItems: SimpleArrayItem[]) => void;
  options?: ComboboxItem[];
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
}

export const ExpandedSimpleArray = ({
  // labelProps,
  items,
  canDeleteLastItem,
  placeholder,
  valueType,
  itemEnum,
  setItems,
  readonly,
  options,
  ...props
}: ExpandedSimpleArrayProps): JSX.Element => {
  const intl = useIntl();

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new item',
    id: 'JWl/LD',
    description: 'Label to add item to array editor',
  });

  const deleteItem = (index: number): void => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleArrayElementSaved = (prevVal: ValueSegment[], newState: ChangeState, index: number) => {
    if (notEqual(prevVal, newState.value)) {
      const newItems = JSON.parse(JSON.stringify(items));
      newItems[index].value = newState.value;
      setItems(newItems);
    }
  };

  const comboboxOptions = getComoboxEnumOptions(options, itemEnum);

  return (
    <div className="msla-array-container msla-array-item-container">
      {items.map((item, index) => {
        return (
          <div key={item.key + index} className="msla-array-item">
            <Badge className="msla-array-index" shape="rounded" appearance="tint">
              {index + 1}
            </Badge>
            {comboboxOptions ? (
              <Combobox
                {...props}
                valueType={valueType}
                options={comboboxOptions}
                initialValue={item.value ?? []}
                placeholder={placeholder}
                onChange={(newState) => handleArrayElementSaved(item.value ?? [], newState, index)}
              />
            ) : (
              <StringEditor
                {...props}
                className="msla-array-editor-container-expanded"
                valueType={valueType}
                initialValue={item.value ?? []}
                editorBlur={(newState) => handleArrayElementSaved(item.value ?? [], newState, index)}
                placeholder={placeholder}
              />
            )}
            <RemoveItemButton
              disabled={!!readonly}
              itemKey={index}
              visible={canDeleteLastItem || items.length > 1}
              onClick={(index) => deleteItem(index)}
            />
          </div>
        );
      })}
      <div className="msla-array-toolbar">
        <Button
          disabled={readonly}
          icon={<AddIcon />}
          size={'small'}
          appearance="subtle"
          onClick={() => setItems([...items, { value: [], key: guid() }])}
          style={{ paddingLeft: '1px', gap: '2px' }}
        >
          {addItemButtonLabel}
        </Button>
      </div>
    </div>
  );
};
