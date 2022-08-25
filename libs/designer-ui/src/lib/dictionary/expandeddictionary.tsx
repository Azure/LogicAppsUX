import type { DictionaryEditorItemProps } from '.';
import { BaseEditor } from '../editor/base';
import type { ButtonOffSet } from '../editor/base/plugins/TokenPickerButton';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
import { DeleteDictionaryItem } from './plugins/DeleteDictionaryItem';
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
  setItems: (items: DictionaryEditorItemProps[]) => void;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
}

export const ExpandedDictionary = ({ items, GetTokenPicker, setItems }: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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
    const offset = editorRef.current?.offsetHeight;
    const height = containerRef.current?.offsetHeight;
    if (offset && height) {
      setPickerOffset({ heightOffset: height - offset * index, widthOffset: type === ExpandedDictionaryEditorType.KEY ? -269 : -7 });
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
            <div className="msla-dictionary-item-cell" ref={editorRef}>
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={keyPlaceholder}
                initialValue={item.key ?? []}
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
                <DeleteDictionaryItem items={items} index={index} type={ExpandedDictionaryEditorType.KEY} />
              </BaseEditor>
            </div>
            <div className="msla-dictionary-item-cell">
              <BaseEditor
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
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
                <DeleteDictionaryItem items={items} index={index} type={ExpandedDictionaryEditorType.VALUE} />
              </BaseEditor>
            </div>
            <DictionaryDeleteButton items={items} index={index} setItems={setItems} />
          </div>
        );
      })}
    </div>
  );
};
