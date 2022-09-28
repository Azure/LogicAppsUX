import type { DictionaryEditorItemProps } from '.';
import constants from '../constants';
import { BaseEditor } from '../editor/base';
import type { ButtonOffSet } from '../editor/base/plugins/TokenPickerButton';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
import { SerializeExpandedDictionary } from './plugins/SerializeExpandedDictionary';
import { isEmpty } from './util/helper';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useCallback, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export enum ExpandedDictionaryEditorType {
  KEY = 'key',
  VALUE = 'value',
}
export interface ExpandedDictionaryProps {
  items: DictionaryEditorItemProps[];
  isTrigger?: boolean;
  readonly?: boolean;
  setItems: (items: DictionaryEditorItemProps[]) => void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const ExpandedDictionary = ({ items, isTrigger, readonly, GetTokenPicker, setItems }: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<(HTMLDivElement | null)[]>([]);

  const [pickerOffset, setPickerOffset] = useState<ButtonOffSet>();
  const [currIndex, setCurrIndex] = useState<number>(0);
  const [currType, setCurrType] = useState<ExpandedDictionaryEditorType>(ExpandedDictionaryEditorType.KEY);

  const onChange = useCallback(() => {
    updateHeight(currIndex, currType);
  }, [currIndex, currType]);

  const keyPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter key',
    description: 'Placeholder text for Key',
  });
  const valuePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter value',
    description: 'Placeholder text for Value',
  });

  const updateHeight = (index: number, type: ExpandedDictionaryEditorType) => {
    if (containerRef.current && editorRef.current[index]) {
      const containerBottomLoc = window.scrollY + containerRef.current.getBoundingClientRect().top + containerRef.current.offsetHeight;
      let itemHeight = window.scrollY;
      itemHeight += editorRef.current[index]?.getBoundingClientRect().top ?? 0;

      setPickerOffset({
        heightOffset: containerBottomLoc - itemHeight,
        widthOffset:
          type === ExpandedDictionaryEditorType.KEY
            ? constants.EXPANDED_DICTIONARY_WIDTH_OFFSET.KEY_OFFSET
            : constants.EXPANDED_DICTIONARY_WIDTH_OFFSET.VALUE_OFFSET,
      });
    }
  };

  const addItem = (index: number, type: ExpandedDictionaryEditorType) => {
    setCurrIndex(index);
    setCurrType(type);
    updateHeight(index, type);
    if (index === items.length - 1 && !isEmpty(items[index])) {
      setItems([...items, { key: [], value: [] }]);
    }
  };

  return (
    <div className="msla-dictionary-container msla-dictionary-item-container" ref={containerRef}>
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
                onFocus={() => addItem(index, ExpandedDictionaryEditorType.KEY)}
                tokenPickerButtonProps={{
                  buttonOffset: pickerOffset,
                }}
                GetTokenPicker={GetTokenPicker}
              >
                <OnChangePlugin onChange={onChange} />
                <SerializeExpandedDictionary
                  items={items}
                  initialItem={item.key}
                  index={index}
                  type={ExpandedDictionaryEditorType.KEY}
                  setItems={setItems}
                />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                isTrigger={isTrigger}
                readonly={readonly}
                BasePlugins={{ tokens: true, clearEditor: true, autoFocus: false }}
                tokenPickerButtonProps={{
                  buttonOffset: pickerOffset,
                }}
                onFocus={() => addItem(index, ExpandedDictionaryEditorType.VALUE)}
                GetTokenPicker={GetTokenPicker}
              >
                <OnChangePlugin onChange={onChange} />
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
