import type { DictionaryEditorItemProps } from '.';
import type { GetTokenPickerHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
import { SerializeExpandedDictionary } from './plugins/SerializeExpandedDictionary';
import { isEmpty } from './util/helper';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export enum ExpandedDictionaryEditorType {
  KEY = 'key',
  VALUE = 'value',
}
export interface ExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  isTrigger?: boolean;
  readonly?: boolean;
  keyTitle?: string;
  keyType?: string;
  valueTitle?: string;
  valueType?: string;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  getTokenPicker: GetTokenPickerHandler;
}

export const ExpandedDictionary = ({
  items,
  isTrigger,
  readonly,
  keyTitle,
  keyType,
  valueTitle,
  valueType,
  getTokenPicker,
  setItems,
}: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<(HTMLDivElement | null)[]>([]);

  const keyPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter key',
    description: 'Placeholder text for Key',
  });
  const valuePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter value',
    description: 'Placeholder text for Value',
  });

  const addItem = (index: number) => {
    if (index === items.length - 1 && !isEmpty(items[index])) {
      setItems([...items, { key: [], value: [] }]);
    }
  };

  return (
    <div className="msla-dictionary-container msla-dictionary-editor-expanded" ref={containerRef}>
      {keyTitle || valueTitle ? (
        <div className="msla-dictionary-editor-item">
          <div className="msla-dictionary-item-header">{keyTitle}</div>
          <div className="msla-dictionary-item-header">{valueTitle}</div>
        </div>
      ) : null}
      {items.map((item, index) => {
        return (
          <div key={index} className="msla-dictionary-editor-item">
            <div className="msla-dictionary-item-cell" aria-label={`dict-item-${index}`} ref={(el) => (editorRef.current[index] = el)}>
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={keyPlaceholder}
                initialValue={item.key ?? []}
                isTrigger={isTrigger}
                readonly={readonly}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                getTokenPicker={getTokenPicker}
                onFocus={() => addItem(index)}
                editorValueType={keyType}
              >
                <SerializeExpandedDictionary
                  items={items}
                  initialItem={item.key}
                  index={index}
                  type={ExpandedDictionaryEditorType.KEY}
                  setItems={setItems}
                />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell" ref={(el) => (editorRef.current[index] = el)}>
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                isTrigger={isTrigger}
                readonly={readonly}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                getTokenPicker={getTokenPicker}
                onFocus={() => addItem(index)}
                editorValueType={valueType}
              >
                <SerializeExpandedDictionary
                  items={items}
                  initialItem={item.value}
                  index={index}
                  type={ExpandedDictionaryEditorType.VALUE}
                  setItems={setItems}
                />
              </BaseEditor>
            </div>
            <DictionaryDeleteButton items={items} index={index} setItems={setItems} />
          </div>
        );
      })}
    </div>
  );
};
