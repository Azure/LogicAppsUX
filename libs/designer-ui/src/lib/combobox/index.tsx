import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
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
import { guid } from '@microsoft-logic-apps/utils';
import { useRef, useState, useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';

const comboboxStyles: Partial<IComboBoxStyles> = {
  root: {
    minHeight: '30px',
  },
  divider: {
    height: '2px',
  },
  input: {
    fontSize: '14px',
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
const buttonStyles: Partial<IButtonStyles> = { root: { height: '28px', width: '30px' } };

export interface ComboboxItem {
  disabled?: boolean;
  key: string;
  value: any;
  displayName: string;
  type?: string;
}
export interface ComboboxProps {
  options: ComboboxItem[];
  initialValue: ValueSegment[];
  placeholder?: string;
  label?: string;
  useOption?: boolean;
  readOnly?: boolean; // TODO - Need to have readOnly version
  required?: boolean;
  onChange?: ChangeHandler;
}
export const Combobox = ({
  options,
  initialValue,
  placeholder,
  label,
  useOption = true,
  required,
  onChange,
}: ComboboxProps): JSX.Element => {
  const intl = useIntl();
  const comboBoxRef = useRef<IComboBox>(null);
  const [customValue, setCustomValue] = useState<ValueSegment[] | null>(initialValue ?? null);
  const [selectedKey, setSelectedKey] = useState<string>(getSelectedKey(options, initialValue));
  const [comboboxOptions, setComboBoxOptions] = useState<IComboBoxOption[]>(getOptions(options));

  useEffect(() => {
    if (selectedKey) {
      setCustomValue(null);
    }
    if (onChange) {
      onChange({ value: [{ id: guid(), type: ValueSegmentType.LITERAL, value: getSelectedValue(options, selectedKey) }] });
    }
  }, [onChange, options, selectedKey]);

  useEffect(() => {
    if (customValue) {
      setSelectedKey('');
    }
    if (onChange && customValue) {
      onChange({ value: customValue });
    }
  }, [customValue, onChange]);

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
        newOptions.push({ key: 'header', value: noValuesLabel, disabled: true, displayName: noValuesLabel });
      }
      newOptions.push({ key: 'divider', value: '-', displayName: '-' });
      if (options.filter((option) => option.value === value).length === 0 && value !== '' && useOption) {
        const customValueLabel = intl.formatMessage(
          {
            defaultMessage: 'Use "{value}" as a custom value',
            description: 'Label for button to allow user to create custom value in combobox from current input',
          },
          { value: value }
        );
        newOptions.push({ key: value, value: customValueLabel, displayName: customValueLabel, disabled: false, type: 'customrender' });
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
      setCustomValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: option.key === 'customValue' ? '' : option.key.toString() }]);
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
    setCustomValue(null);
    updateOptions('');
  };

  return (
    <div className="msla-combobox-container">
      {label ? <Label className="msla-combobox-label" text={label} isRequiredField={required} /> : null}
      {customValue ? (
        <div className="msla-combobox-editor-container">
          <BaseEditor
            className="msla-combobox-editor"
            placeholder={placeholder}
            BasePlugins={{ tokens: true, clearEditor: true, autoFocus: true }}
            initialValue={customValue}
          >
            <CustomValue setCustomVal={setCustomValue} />
          </BaseEditor>
          <TooltipHost content={clearEditor} calloutProps={calloutProps} styles={hostStyles} setAriaDescribedBy={false}>
            <IconButton styles={buttonStyles} iconProps={clearIcon} aria-label={clearEditor} onClick={() => handleClearClick()} />
          </TooltipHost>
        </div>
      ) : (
        <ComboBox
          className="msla-combobox"
          selectedKey={selectedKey}
          componentRef={comboBoxRef}
          useComboBoxAsMenuWidth
          allowFreeform
          autoComplete="off"
          placeholder={placeholder}
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
      const { key, displayName, disabled, type } = option;
      switch (key) {
        case 'divider':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Divider, disabled: disabled, data: type };
        case 'header':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Header, data: type, disabed: disabled };
        default:
          return { key: key, text: displayName, disabled: disabled, data: type };
      }
    }),
    { key: 'customValue', text: customValueLabel, styles: customValueStyles, data: 'customrender' },
  ];
};

const getSelectedKey = (options: ComboboxItem[], initialValue: ValueSegment[]): string => {
  if (initialValue.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    return (
      options.find((option) => {
        return option.value === initialValue[0].value;
      })?.key ?? ''
    );
  }
  return '';
};

const getSelectedValue = (options: ComboboxItem[], key: string): string => {
  return options.find((option) => {
    return option.key === key;
  })?.value;
};
