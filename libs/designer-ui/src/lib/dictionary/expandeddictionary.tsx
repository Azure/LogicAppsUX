import type { DictionaryEditorItemProps } from '.';
import { BaseEditor } from '../editor/base';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
import { DeleteDictionaryItem } from './plugins/DeleteDictionaryItem';
import { SerializeExpandedDictionary } from './plugins/SerializeExpandedDictionary';
import { isEmpty } from './util/helper';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

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
                onFocus={() => addItem(index)}
                tokenPickerButtonProps={{ buttonClassName: 'msla-expanded-dictionary-editor-tokenpicker', buttonHeight: pickerOffset }}
              >
                <OnChangePlugin onChange={onChange} />
                <SerializeExpandedDictionary items={items} initialItem={item.key} index={index} type={'key'} setItems={setItems} />
                <DeleteDictionaryItem items={items} index={index} type={'key'} />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                tokenPickerButtonProps={{ buttonClassName: 'msla-expanded-dictionary-editor-tokenpicker', buttonHeight: pickerOffset }}
                onFocus={() => addItem(index)}
              >
                <OnChangePlugin onChange={onChange} />
                <SerializeExpandedDictionary items={items} initialItem={item.value} index={index} type={'value'} setItems={setItems} />
                <DeleteDictionaryItem items={items} index={index} type={'value'} />
              </BaseEditor>
            </div>
            <DictionaryDeleteButton items={items} index={index} setItems={setItems} />
          </div>
        );
      })}
    </div>
  );
};
