import type { DictionaryEditorItemProps } from '.';
import { BaseEditor } from '../editor/base';
import { EditorChange } from './plugins/EditorChange';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export interface ExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const ExpandedDictionary = ({ items, setItems }: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);

  const [pickerOffset, setPickerOffset] = useState(0);
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
                BasePlugins={{ tokens: true, clearEditor: true }}
                tokenPickerProps={{ tokenPickerClassName: 'msla-expanded-dictionary-editor-tokenpicker', tokenPickerHeight: pickerOffset }}
              >
                <OnChangePlugin onChange={onChange} />
                <EditorChange items={items} initialItem={item.key} index={index} type={'key'} setItems={setItems} />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                BasePlugins={{ tokens: true, clearEditor: true }}
                tokenPickerProps={{ tokenPickerClassName: 'msla-expanded-dictionary-editor-tokenpicker', tokenPickerHeight: pickerOffset }}
              >
                <EditorChange items={items} initialItem={item.value} index={index} type={'value'} setItems={setItems} />
                <OnChangePlugin onChange={onChange} />
              </BaseEditor>
            </div>
            {/* {renderDelete()} */}
          </div>
        );
      })}
    </div>
  );
};
