import constants from '../constants';
import type { ValueSegment } from '../editor';
import { EditorCollapseToggle } from '../editor';
import type { BaseEditorProps, GetTokenPickerHandler } from '../editor/base';
import { convertKeyValueItemToSegments } from '../editor/base/utils/keyvalueitem';
import { CollapsedDictionary } from './collapsedDictionary';
import { ExpandedDictionary } from './expandeddictionary';
import { guid } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const DictionaryType = {
  DEFAULT: 'default',
  TABLE: 'table',
} as const;
export type DictionaryType = (typeof DictionaryType)[keyof typeof DictionaryType];
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
  getTokenPicker: GetTokenPickerHandler;
}

export const DictionaryEditor: React.FC<DictionaryEditorProps> = ({
  disableToggle = false,
  initialItems,
  initialValue,
  keyTitle,
  valueTitle,
  dictionaryType = DictionaryType.DEFAULT,
  keyType = constants.SWAGGER.TYPE.STRING,
  valueType = constants.SWAGGER.TYPE.STRING,
  getTokenPicker,
  onChange,
  ...baseEditorProps
}): JSX.Element => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(!initialItems);
  const [items, setItems] = useState(initialItems);
  const [collapsedValue, setCollapsedValue] = useState<ValueSegment[]>(initialValue);
  const [isValid, setIsValid] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const updateItems = (newItems: DictionaryEditorItemProps[]) => {
    setItems(newItems);
    const objectValue = convertKeyValueItemToSegments(newItems, keyType, valueType);
    setCollapsedValue(objectValue);

    if (!collapsed) {
      onChange?.({ value: objectValue, viewModel: { items: newItems } });
    }
  };

  const handleCollapsedBlur = (): void => {
    onChange?.({ value: collapsedValue, viewModel: { items: isValid ? items : undefined } });
  };

  const expandedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to text mode',
    id: 'msc5756edb2e9f',
    description: 'Label for editor toggle button when in expanded mode',
  });

  const collapsedLabel: string = intl.formatMessage({
    defaultMessage: 'Switch to key value mode',
    id: 'ms743f32d67ca5',
    description: 'Label for editor toggle button when in collapsed mode',
  });

  return (
    <div className="msla-dictionary-editor-container" data-automation-id={baseEditorProps.dataAutomationId}>
      {collapsed && !(dictionaryType === DictionaryType.TABLE) ? (
        <CollapsedDictionary
          labelId={baseEditorProps.labelId}
          readonly={baseEditorProps.readonly}
          collapsedValue={collapsedValue}
          keyType={keyType}
          valueType={valueType}
          tokenPickerButtonProps={baseEditorProps.tokenPickerButtonProps}
          getTokenPicker={getTokenPicker}
          setItems={(newItems: DictionaryEditorItemProps[]) => setItems(newItems)}
          setIsValid={setIsValid}
          setCollapsedValue={(val: ValueSegment[]) => setCollapsedValue(val)}
          onBlur={handleCollapsedBlur}
          tokenMapping={baseEditorProps.tokenMapping}
          loadParameterValueFromString={baseEditorProps.loadParameterValueFromString}
        />
      ) : (
        <ExpandedDictionary
          label={baseEditorProps?.label}
          items={items ?? [{ key: [], value: [], id: guid() }]}
          readonly={baseEditorProps.readonly}
          keyTitle={keyTitle}
          valueTitle={valueTitle}
          keyType={keyType}
          valueType={valueType}
          setItems={updateItems}
          tokenPickerButtonProps={baseEditorProps.tokenPickerButtonProps}
          getTokenPicker={getTokenPicker}
          tokenMapping={baseEditorProps.tokenMapping}
          loadParameterValueFromString={baseEditorProps.loadParameterValueFromString}
        />
      )}

      <div className="msla-dictionary-commands">
        {!disableToggle && !(dictionaryType === DictionaryType.TABLE) ? (
          <EditorCollapseToggle
            label={collapsed ? collapsedLabel : expandedLabel}
            collapsed={collapsed}
            disabled={collapsed && !isValid}
            toggleCollapsed={toggleCollapsed}
          />
        ) : null}
      </div>
    </div>
  );
};
