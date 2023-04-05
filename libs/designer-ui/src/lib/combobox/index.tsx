import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps, CallbackHandler } from '../editor/base';
import { BaseEditor } from '../editor/base';
import { Change } from '../editor/base/plugins/Change';
import type {
  IButtonStyles,
  IComboBox,
  IComboBoxOption,
  IComboBoxOptionStyles,
  IComboBoxStyles,
  IIconProps,
  ITooltipHostStyles,
} from '@fluentui/react';
import { Spinner, SpinnerSize, IconButton, TooltipHost, SelectableOptionMenuItemType, ComboBox } from '@fluentui/react';
import { getIntl } from '@microsoft/intl-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import { useUpdateEffect } from '@react-hookz/web';
import { useRef, useState, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

enum Mode {
  Default,
  Custom,
}

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
const buttonStyles: Partial<IButtonStyles> = { root: { height: '28px', width: '30px', position: 'absolute', right: 0 } };

export interface ComboboxItem {
  disabled?: boolean;
  key: string;
  value: any;
  displayName: string;
  type?: string;
}

export interface ComboboxProps extends BaseEditorProps {
  options: ComboboxItem[];
  isLoading?: boolean;
  errorDetails?: { message: string };
  useOption?: boolean;
  onMenuOpen?: CallbackHandler;
}

export const Combobox = ({
  options,
  initialValue,
  isLoading,
  errorDetails,
  useOption = true,
  onChange,
  onMenuOpen,
  ...baseEditorProps
}: ComboboxProps): JSX.Element => {
  const intl = useIntl();
  const comboBoxRef = useRef<IComboBox>(null);
  const optionKey = getSelectedKey(options, initialValue);
  const [value, setValue] = useState<ValueSegment[]>(initialValue);
  const [mode, setMode] = useState<Mode>(getMode(optionKey, initialValue));
  const [selectedKey, setSelectedKey] = useState<string>(optionKey);
  const [searchValue, setSearchValue] = useState<string>('');
  //const [comboboxOptions, setComboBoxOptions] = useState<IComboBoxOption[]>(getOptions(options));
  const [canAutoFocus, setCanAutoFocus] = useState(false);

  const comboboxOptions = useMemo(() => {
    const loadingOption: ComboboxItem = {
      key: 'isloading',
      value: 'isloading',
      disabled: true,
      displayName: intl.formatMessage({ defaultMessage: 'Loading...', description: 'Loading text when items are being fetched' }),
      type: 'loadingrender',
    };
    const errorOption: ComboboxItem = {
      key: 'errorText',
      value: 'errorText',
      disabled: true,
      displayName: errorDetails?.message ?? '',
      type: 'errorrender',
    };
    if (searchValue) {
      const newOptions = isLoading
        ? [loadingOption]
        : errorDetails
        ? [errorOption]
        : options.filter((option) => new RegExp(searchValue.replace(/\\/g, '').toLowerCase()).test(option.value.toLowerCase()));

      if (newOptions.length === 0) {
        const noValuesLabel = intl.formatMessage({
          defaultMessage: 'No values matching your search',
          description: 'Label for when no values match search value',
        });
        newOptions.push({ key: 'header', value: noValuesLabel, disabled: true, displayName: noValuesLabel });
      }
      newOptions.push({ key: 'divider', value: '-', displayName: '-' });
      if (options.filter((option) => option.value === searchValue).length === 0 && searchValue !== '' && useOption) {
        const customValueLabel = intl.formatMessage(
          {
            defaultMessage: 'Use "{value}" as a custom value',
            description: 'Label for button to allow user to create custom value in combobox from current input',
          },
          { value: searchValue }
        );
        newOptions.push({
          key: searchValue,
          value: customValueLabel,
          displayName: customValueLabel,
          disabled: false,
          type: 'customrender',
        });
      }

      return getOptions(newOptions);
    }

    return getOptions(isLoading ? [loadingOption] : errorDetails ? [errorOption] : options);
  }, [intl, errorDetails, searchValue, isLoading, options, useOption]);

  useUpdateEffect(() => {
    onChange?.({
      value:
        mode === Mode.Custom
          ? value
          : [{ id: guid(), type: ValueSegmentType.LITERAL, value: selectedKey ? getSelectedValue(options, selectedKey).toString() : '' }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedKey]);

  const toggleExpand = useCallback(() => {
    comboBoxRef.current?.focus(true);
    comboBoxRef.current?.dismissMenu();
  }, []);

  const handleMenuOpen = (): void => {
    onMenuOpen?.();
  };

  const updateOptions = (value?: string): void => {
    comboBoxRef.current?.focus(true);
    setSelectedKey('');
    setSearchValue(value ?? '');
  };

  const onRenderOption = (item?: IComboBoxOption) => {
    switch (item?.data) {
      case 'customrender':
        return <span className="msla-combobox-custom-option">{item?.text}</span>;
      case 'loadingrender':
        return (
          <div className="msla-combobox-loading">
            <Spinner size={SpinnerSize.small} />
            <span className="msla-combobox-loading-text">{item?.text}</span>
          </div>
        );
      default:
        return <span className="msla-combobox-option">{item?.text}</span>;
    }
  };

  const handleOptionSelect = (option?: IComboBoxOption): void => {
    if (option?.data === 'customrender') {
      setValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: option.key === 'customValue' ? '' : option.key.toString() }]);
      setMode(Mode.Custom);
      setCanAutoFocus(true);
    } else {
      if (setSelectedKey && option?.key) {
        setSelectedKey(option.key.toString());
        setMode(Mode.Default);
      }
    }
  };

  const clearEditor = intl.formatMessage({
    defaultMessage: 'Clear custom value',
    description: 'Label for button to clear the editor',
  });

  const handleClearClick = () => {
    setSelectedKey('');
    updateOptions('');
    setMode(Mode.Default);
  };

  const handleBlur = () => {
    onChange?.({ value });
  };

  return (
    <div className="msla-combobox-container">
      {mode === Mode.Custom ? (
        <div className="msla-combobox-editor-container">
          <BaseEditor
            readonly={baseEditorProps.readonly}
            className="msla-combobox-editor"
            BasePlugins={{ tokens: true, clearEditor: true, autoFocus: canAutoFocus }}
            initialValue={value}
            onBlur={handleBlur}
            getTokenPicker={baseEditorProps.getTokenPicker}
            placeholder={baseEditorProps.placeholder}
            isTrigger={baseEditorProps.isTrigger}
            tokenPickerButtonEditorProps={{ showOnLeft: true }}
          >
            <Change setValue={setValue} />
          </BaseEditor>
          <TooltipHost content={clearEditor} calloutProps={calloutProps} styles={hostStyles}>
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
          options={comboboxOptions}
          disabled={baseEditorProps.readonly}
          placeholder={baseEditorProps.placeholder}
          onInputValueChange={updateOptions}
          onClick={toggleExpand}
          onRenderOption={onRenderOption}
          styles={comboboxStyles}
          onItemClick={(_, o) => handleOptionSelect(o)}
          onMenuOpen={handleMenuOpen}
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

const getMode = (selectedKey: string, initialValue: ValueSegment[]): Mode => {
  const hasValue = initialValue.length > 0 && initialValue[0].value;
  return hasValue ? (selectedKey ? Mode.Default : Mode.Custom) : Mode.Default;
};

const getSelectedKey = (options: ComboboxItem[], initialValue?: ValueSegment[]): string => {
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    return (
      options.find((option) => {
        return option.value === initialValue[0].value;
      })?.key ?? ''
    );
  }
  return '';
};

const getSelectedValue = (options: ComboboxItem[], key: string): any => {
  return options.find((option) => {
    return option.key === key;
  })?.value;
};
