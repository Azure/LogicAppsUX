import type { DictionaryEditorItemProps } from '.';
import type { ChangeState } from '..';
import type { GetTokenPickerHandler } from '../editor/base';
import { StringEditor } from '../editor/string';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
// import { SerializeExpandedDictionary } from './plugins/SerializeExpandedDictionary';
import { isEmpty } from './util/helper';
import { guid } from '@microsoft/utils-logic-apps';
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
      setItems([...items, { key: [], value: [], id: guid() }]);
    }
  };

  const handleBlur = (newState: ChangeState, index: number, type: ExpandedDictionaryEditorType) => {
    const updatedValue = newState.value;
    if (type === ExpandedDictionaryEditorType.KEY) {
      const updatedItems = [...items.slice(0, index), { ...items[index], key: updatedValue }, ...items.slice(index + 1)];
      setItems(updatedItems);
    } else {
      const updatedItems = [...items.slice(0, index), { ...items[index], value: updatedValue }, ...items.slice(index + 1)];
      setItems(updatedItems);
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
          <div key={item.id} className="msla-dictionary-editor-item">
            <div className="msla-dictionary-item-cell" aria-label={`dict-item-${index}`} ref={(el) => (editorRef.current[index] = el)}>
              <StringEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={keyPlaceholder}
                initialValue={item.key ?? []}
                isTrigger={isTrigger}
                readonly={readonly}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                getTokenPicker={getTokenPicker}
                onFocus={() => addItem(index)}
                valueType={keyType}
                editorBlur={(newState: ChangeState) => handleBlur(newState, index, ExpandedDictionaryEditorType.KEY)}
              ></StringEditor>
            </div>
            <div className="msla-dictionary-item-cell" ref={(el) => (editorRef.current[index] = el)}>
              <StringEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                isTrigger={isTrigger}
                readonly={readonly}
                BasePlugins={{ tokens: true, autoFocus: false }}
                getTokenPicker={getTokenPicker}
                onFocus={() => addItem(index)}
                valueType={valueType}
                editorBlur={(newState: ChangeState) => handleBlur(newState, index, ExpandedDictionaryEditorType.VALUE)}
              ></StringEditor>
            </div>
            <DictionaryDeleteButton items={items} index={index} setItems={setItems} />
          </div>
        );
      })}
    </div>
  );
};
