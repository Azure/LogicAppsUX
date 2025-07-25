import type { DictionaryEditorItemProps } from '.';
import type { ChangeState } from '..';
import type { BaseEditorProps } from '../editor/base';
import { isEmptySegments } from '../editor/base/utils/parsesegments';
import { StringEditor } from '../editor/string';
import { DictionaryDeleteButton } from './expandeddictionarydelete';
import { guid } from '@microsoft/logic-apps-shared';
import { useRef } from 'react';
import { useIntl } from 'react-intl';

export const ExpandedDictionaryEditorType = {
  KEY: 'key',
  VALUE: 'value',
} as const;
export type ExpandedDictionaryEditorType = (typeof ExpandedDictionaryEditorType)[keyof typeof ExpandedDictionaryEditorType];

export interface ExpandedDictionaryProps extends Partial<BaseEditorProps> {
  items: DictionaryEditorItemProps[];
  keyTitle?: string;
  keyType?: string;
  valueTitle?: string;
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const ExpandedDictionary = ({
  items,
  keyTitle,
  keyType,
  valueTitle,
  valueType,
  setItems,
  label,
  basePlugins,
  ...props
}: ExpandedDictionaryProps): JSX.Element => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<(HTMLDivElement | null)[]>([]);

  const keyPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter key',
    id: 'pC2nr2',
    description: 'Placeholder text for Key',
  });
  const valuePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter value',
    id: 'zCsGWP',
    description: 'Placeholder text for Value',
  });

  const itemKeyLabel = intl.formatMessage(
    {
      defaultMessage: '{label} key item',
      id: '5+zBXE',
      description: 'Label for Key',
    },
    { label }
  );
  const itemValueLabel = intl.formatMessage(
    {
      defaultMessage: '{label} value item',
      id: 'cKNvk6',
      description: 'Label for Value',
    },
    { label }
  );

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
            <div className="msla-dictionary-item-cell" ref={(el) => (editorRef.current[index] = el)}>
              <StringEditor
                {...props}
                dataAutomationId={`${props.dataAutomationId}-key-${index}`}
                ariaLabel={`${itemKeyLabel} ${index}`}
                className="msla-dictionary-editor-container-expanded"
                placeholder={keyPlaceholder}
                initialValue={item.key ?? []}
                basePlugins={{ tokens: true, clearEditor: true, autoFocus: false, ...basePlugins }}
                onFocus={() => addItem(index)}
                valueType={keyType}
                editorBlur={(newState: ChangeState) => handleBlur(newState, index, ExpandedDictionaryEditorType.KEY)}
              />
            </div>
            <div className="msla-dictionary-item-cell" ref={(el) => (editorRef.current[index] = el)}>
              <StringEditor
                {...props}
                dataAutomationId={`${props.dataAutomationId}-value-${index}`}
                ariaLabel={`${itemValueLabel} ${index}`}
                className="msla-dictionary-editor-container-expanded"
                placeholder={valuePlaceholder}
                initialValue={item.value ?? []}
                basePlugins={{ tokens: true, autoFocus: false, ...basePlugins }}
                onFocus={() => addItem(index)}
                valueType={valueType}
                editorBlur={(newState: ChangeState) => handleBlur(newState, index, ExpandedDictionaryEditorType.VALUE)}
              />
            </div>
            <DictionaryDeleteButton items={items} index={index} setItems={setItems} disabled={props.readonly} />
          </div>
        );
      })}
    </div>
  );
};

export const isEmpty = (item: DictionaryEditorItemProps) => {
  return isEmptySegments(item.key) && isEmptySegments(item.value);
};
