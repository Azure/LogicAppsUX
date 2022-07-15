import { ValueSegmentType } from '../editor';
import type { Segment } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Label } from '../label';
import { CustomValue } from './plugins/CustomValue';
import type {
  IButtonStyles,
  IComboBox,
  IComboBoxOption,
  IComboBoxOptionStyles,
  IComboBoxStyles,
  IIconProps,
  ITooltipHostStyles,
} from '@fluentui/react';
import { IconButton, TooltipHost, SelectableOptionMenuItemType, ComboBox } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';

const comboboxStyles: Partial<IComboBoxStyles> = {
  divider: {
    height: '2px',
  },
};

const customValueStyles: Partial<IComboBoxOptionStyles> = {
  label: {
    color: 'blue',
  },
};

const clearIcon: IIconProps = { iconName: 'Cancel' };
const calloutProps = { gapSpace: 0 };
const hostStyles: Partial<ITooltipHostStyles> = { root: { display: 'inline-block' } };
const buttonStyles: Partial<IButtonStyles> = { root: { height: '22px', width: '30px' } };

export interface ComboboxItem {
  disabled?: boolean;
  key: string;
  value: string;
  displayName?: string;
  data?: any;
}
export interface ComboboxProps {
  options: ComboboxItem[];
  customValue: Segment[] | null;
  placeholderText?: string;
  label?: string;
  allowFreeForm?: boolean;
  selectedKey?: string | number;
  required?: boolean;
  setSelectedKey?: (key: string) => void;
  setCustomValue?: (customVal: Segment[] | null) => void;
}
export const Combobox = ({
  customValue,
  options,
  placeholderText,
  label,
  allowFreeForm = true,
  required = true,
  selectedKey,
  setSelectedKey,
  setCustomValue,
}: ComboboxProps): JSX.Element => {
  const intl = useIntl();
  const comboBoxRef = useRef<IComboBox>(null);
  const [customVal, setCustomVal] = useState<Segment[] | null>(customValue);
  const [comboboxOptions, setComboBoxOptions] = useState<IComboBoxOption[]>(getOptions(options));

  useEffect(() => {
    if (setCustomValue && customVal) {
      setCustomValue(customVal);
    }
  }, [customVal, setCustomValue]);

  const toggleExpand = useCallback(() => {
    comboBoxRef.current?.focus(true);
    comboBoxRef.current?.dismissMenu();
  }, []);

  const updateOptions = (value?: string): void => {
    if (value !== undefined) {
      comboBoxRef.current?.focus(true);
      const newOptions = options.filter((option) => new RegExp(value.replace(/\\/g, '').toLowerCase()).test(option.value.toLowerCase()));
      if (newOptions.length === 0) {
        const noValuesLabel = intl.formatMessage({
          defaultMessage: 'No values matching your search',
          description: 'Label for when no values match search value',
        });
        newOptions.push({ key: 'header', value: noValuesLabel, disabled: true });
      }
      newOptions.push({ key: 'divider', value: '-' });
      if (options.filter((option) => option.value === value).length === 0 && value !== '') {
        const customValueLabel = intl.formatMessage(
          {
            defaultMessage: 'Use "{value}" as a custom value',
            description: 'Label for button to allow user to create custom value in combobox from current input',
          },
          { value: value }
        );
        newOptions.push({ key: value, value: customValueLabel, disabled: false, data: 'customrender' });
      }
      setComboBoxOptions(getOptions(newOptions));
    }
  };

  const onRenderOption = (item?: IComboBoxOption) => {
    switch (item?.data) {
      case 'customrender':
        return <span className="msla-combobox-custom-option">{item?.text}</span>;
      default:
        return <span className="msla-combobox-option">{item?.text}</span>;
    }
  };

  const handleCustomOptions = (option?: IComboBoxOption): void => {
    if (option?.data === 'customrender') {
      setCustomVal([{ type: ValueSegmentType.LITERAL, value: option.key === 'customValue' ? '' : option.key.toString() }]);
    } else {
      if (setSelectedKey && option?.key) {
        setSelectedKey(option.key.toString());
      }
    }
  };

  const clearEditor = intl.formatMessage({
    defaultMessage: 'Clear custom value',
    description: 'Label for button to clear the editor',
  });

  const handleClearClick = () => {
    setCustomVal(null);
    updateOptions('');
  };

  return (
    <div className="msla-combobox-container">
      {label ? <Label className="msla-combobox-label" text={label} isRequiredField={required} /> : null}
      {customVal ? (
        <div className="msla-combobox-editor-container">
          <BaseEditor
            className="msla-combobox-editor"
            placeholder={placeholderText}
            BasePlugins={{ tokens: true, clearEditor: true }}
            initialValue={customVal}
          >
            <CustomValue setCustomVal={setCustomVal} />
          </BaseEditor>
          <TooltipHost content={clearEditor} calloutProps={calloutProps} styles={hostStyles} setAriaDescribedBy={false}>
            <IconButton styles={buttonStyles} iconProps={clearIcon} aria-label={clearEditor} onClick={() => handleClearClick()} />
          </TooltipHost>
        </div>
      ) : (
        <ComboBox
          className="msla-combobox"
          defaultSelectedKey={selectedKey}
          componentRef={comboBoxRef}
          useComboBoxAsMenuWidth
          allowFreeform={allowFreeForm}
          autoComplete="off"
          placeholder={placeholderText}
          options={comboboxOptions}
          onInputValueChange={updateOptions}
          onClick={toggleExpand}
          onRenderOption={onRenderOption}
          styles={comboboxStyles}
          onItemClick={(_, o) => handleCustomOptions(o)}
        />
      )}
    </div>
  );
};
const getOptions = (options: ComboboxItem[]): IComboBoxOption[] => {
  const intl = getIntl();

  const customValueLabel = intl.formatMessage({
    defaultMessage: 'Enter custom value',
    description: 'Label for button to allow user to create custom value in combobox',
  });

  return [
    ...options.map((option: ComboboxItem) => {
      const { key, displayName, value, disabled, data } = option;
      switch (key) {
        case 'divider':
          return { key: key, text: value, itemType: SelectableOptionMenuItemType.Divider, disabled: disabled, data: data };
        case 'header':
          return { key: key, text: value, itemType: SelectableOptionMenuItemType.Header, data: data, disabed: disabled };
        default:
          return { key: key, text: displayName ?? value, disabled: disabled, data: data };
      }
    }),
    { key: 'customValue', text: customValueLabel, styles: customValueStyles, data: 'customrender' },
  ];
};
