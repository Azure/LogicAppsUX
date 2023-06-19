import constants from '../constants';
import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import { initializeDictionaryValidation } from '../editor/base/utils/helper';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
import { convertItemsToSegments } from './util/deserializecollapseddictionary';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export enum DictionaryType {
  DEFAULT = 'default',
  TABLE = 'table',
}
export interface DictionaryEditorItemProps {
  id: string;
  key: ValueSegment[];
  value: ValueSegment[];
}

export interface DictionaryEditorProps extends BaseEditorProps {
  disableToggle?: boolean;
  initialItems?: DictionaryEditorItemProps[];
  keyTitle?: string;
  valueTitle?: string;
  keyType?: string;
  dictionaryType?: DictionaryType;
}

export const DictionaryEditor: React.FC<DictionaryEditorProps> = ({
  disableToggle = false,
  initialItems,
  initialValue,
  keyTitle,
  valueTitle,
  dictionaryType = DictionaryType.DEFAULT,
  keyType = constants.SWAGGER.TYPE.STRING,
  valueType,
  getTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(!initialItems ?? false);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [isValid, setIsValid] = useState(initializeDictionaryValidation(initialValue));

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: DictionaryEditorItemProps[]) => {
    setItems(newItems);
    const objectValue = convertItemsToSegments(newItems);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue, viewModel: { items: newItems } });
    }
  };

  const handleBlur = (): void => {
    onChange?.({ value: collapsedValue, viewModel: { items: isValid ? items : undefined } });
  };

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to text mode',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to key value mode',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  return (
    <div className="msla-dictionary-editor-container" data-automation-id={baseEditorProps.dataAutomationId}>
      {collapsed && !(dictionaryType === DictionaryType.TABLE) ? (
        <CollapsedDictionary
          isValid={isValid}
          readonly={baseEditorProps.readonly}
          collapsedValue={collapsedValue}
          getTokenPicker={getTokenPicker}
          setItems={updateItems}
          setIsValid={setIsValid}
          setCollapsedValue={(val: ValueSegment[]) => setCollapsedValue(val)}
          onBlur={handleBlur}
        />
      ) : (
        <ExpandedDictionary
          items={items ?? [{ key: [], value: [], id: guid() }]}
          readonly={baseEditorProps.readonly}
          keyTitle={keyTitle}
          valueTitle={valueTitle}
          keyType={keyType}
          valueType={valueType}
          setItems={updateItems}
          getTokenPicker={getTokenPicker}
        />
      )}

      <div className="msla-dictionary-commands">
        {!disableToggle && !(dictionaryType === DictionaryType.TABLE) ? (
          <EditorCollapseToggle
            label={collapsed ? collapsedLabel : expandedLabel}
            collapsed={collapsed}
            disabled={!isValid || baseEditorProps.readonly}
            toggleCollapsed={toggleCollapsed}
          />
        ) : null}
      </div>
    </div>
  );
};
