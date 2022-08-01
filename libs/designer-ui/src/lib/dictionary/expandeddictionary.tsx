import type { DictionaryEditorItemProps } from '.';
import { BaseEditor } from '../editor/base';
import { HandleDelete } from './plugins/HandleDelete';
import { SerializeExpandedDictionary } from './plugins/SerializeExpandedDictionary';
import { isEmpty } from './util/helper';
import type { IIconProps } from '@fluentui/react';
import { css, IconButton, TooltipHost } from '@fluentui/react';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const deleteButtonIconProps: IIconProps = {
  iconName: 'Cancel',
};
export interface ExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const ExpandedDictionary = ({ items, setItems }: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);

  const [pickerOffset, setPickerOffset] = useState(0);

  useEffect(() => {
    onChange();
  }, [items]);
  const keyPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter key',
    description: 'Placeholder text for Key',
  });
  const valuePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter value',
    description: 'Placeholder text for Value',
  });

  const onChange = () => {
    const height = containerRef.current?.scrollHeight;
    const top = containerRef.current?.offsetTop;
    if (height && top) {
      setPickerOffset(height + top);
    }
  };

  const addItem = (index: number) => {
    if (index === items.length - 1 && !isEmpty(items[index])) {
      setItems([...items, { key: [], value: [] }]);
    }
  };

  const renderDelete = (index: number): JSX.Element => {
    const deleteLabel = intl.formatMessage({
      defaultMessage: 'Click to delete item',
      description: 'Label to delete dictionary item',
    });
    const handleDeleteItem = () => {
      setItems(items.filter((_, i) => i !== index));
    };
    return (
      <TooltipHost content={deleteLabel}>
        <IconButton
          aria-label={deleteLabel}
          className={css('msla-button', 'msla-dictionary-item-delete', index === items.length - 1 ? 'msla-hidden' : undefined)}
          iconProps={deleteButtonIconProps}
          onClick={handleDeleteItem}
        />
      </TooltipHost>
    );
  };

  return (
    <div className="msla-dictionary-container msla-dictionary-item-container" ref={containerRef}>
      {items.map((item, index) => {
        return (
          <div key={index} className="msla-dictionary-editor-item">
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={keyPlaceholder}
                initialValue={item.key ?? []}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                focusProps={{
                  tokenPickerProps: { buttonClassName: 'msla-expanded-dictionary-editor-tokenpicker', buttonHeight: pickerOffset },
                  addDictionaryItem: { addItem: addItem, index: index },
                }}
              >
                <OnChangePlugin onChange={onChange} />
                <SerializeExpandedDictionary items={items} initialItem={item.key} index={index} type={'key'} setItems={setItems} />
                <HandleDelete items={items} index={index} type={'key'} />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                focusProps={{
                  tokenPickerProps: { buttonClassName: 'msla-expanded-dictionary-editor-tokenpicker', buttonHeight: pickerOffset },
                  addDictionaryItem: { addItem: addItem, index: index },
                }}
              >
                <OnChangePlugin onChange={onChange} />
                <SerializeExpandedDictionary items={items} initialItem={item.value} index={index} type={'value'} setItems={setItems} />
                <HandleDelete items={items} index={index} type={'value'} />
              </BaseEditor>
            </div>
            {renderDelete(index)}
          </div>
        );
      })}
    </div>
  );
};
