import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps, CallbackHandler, ChangeHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { EditorChangePlugin } from '../editor/base/plugins/EditorChange';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import type { IComboBox, IComboBoxOption, IComboBoxOptionStyles, IComboBoxStyles } from '@fluentui/react';
import { SelectableOptionMenuItemType, ComboBox } from '@fluentui/react';
import { Button, Spinner, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { equals, getIntl } from '@microsoft/logic-apps-shared';
import { isEmptySegments } from '../editor/base/utils/parsesegments';
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';
import { isComboboxItemMatch } from './helpers/isComboboxItemMatch';

const ClearIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

const Mode = {
  Default: 'Default',
  Custom: 'Custom',
} as const;
type Mode = (typeof Mode)[keyof typeof Mode];

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

const buttonStyles: any = {
  height: '26px',
  width: '26px',
  margin: '2px',
  position: 'absolute',
  right: 0,
  color: 'var(--colorBrandForeground1)',
};

interface SerializationOptions {
  valueType: string;
  separator?: string;
}

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
  isCaseSensitive?: boolean;
  shouldSort?: boolean;
  multiSelect?: boolean;
  serialization?: SerializationOptions;
  onChange?: ChangeHandler;
}

export const Combobox = ({
  options,
  initialValue,
  isLoading,
  errorDetails,
  useOption = true,
  onChange,
  onMenuOpen,
  labelId,
  multiSelect = false,
  serialization,
  label,
  shouldSort = true,
  isCaseSensitive,
  ...baseEditorProps
}: ComboboxProps): JSX.Element => {
  const intl = useIntl();
  const comboBoxRef = useRef<IComboBox>(null);
  const optionKey = getSelectedKey(options, initialValue, isLoading, isCaseSensitive);
  const optionKeys = getSelectedKeys(options, initialValue, serialization, isCaseSensitive);
  const [value, setValue] = useState<ValueSegment[]>(initialValue);
  const [mode, setMode] = useState<Mode>(getMode(optionKey, optionKeys, initialValue, isLoading));
  const [selectedKey, setSelectedKey] = useState<string>(optionKey);
  const [selectedKeys, setSelectedKeys] = useState<string[] | undefined>(multiSelect ? optionKeys : undefined);
  const [searchValue, setSearchValue] = useState<string>('');
  const [canAutoFocus, setCanAutoFocus] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    if ((firstLoad.current || !errorDetails) && !isLoading) {
      firstLoad.current = false;
      const updatedOptionkey = getSelectedKey(options, initialValue, isLoading, isCaseSensitive);
      const updatedOptionKeys = getSelectedKeys(options, initialValue, serialization, isCaseSensitive);
      setSelectedKey(updatedOptionkey);
      setMode(getMode(updatedOptionkey, updatedOptionKeys, initialValue, isLoading));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Sort newOptions array alphabetically based on the `displayName` property.
  useMemo(() => {
    if (shouldSort && !isLoading) {
      options.sort((currentItem, nextItem) => {
        const currentName = currentItem?.displayName;
        const nextName = nextItem?.displayName;
        if (typeof currentName === 'number' && typeof nextName === 'number') {
          return currentName - nextName;
        }
        if (typeof currentName === 'string' && typeof nextName === 'string') {
          return currentName?.localeCompare(nextName);
        }
        return String(currentName).localeCompare(String(nextName));
      });
    }
  }, [isLoading, options, shouldSort]);

  const comboboxOptions = useMemo(() => {
    const loadingOption: ComboboxItem = {
      key: 'isloading',
      value: 'isloading',
      disabled: true,
      displayName: intl.formatMessage({
        defaultMessage: 'Loading...',
        id: 'kM+Mr0',
        description: 'Loading text when items are being fetched',
      }),
      type: 'loadingrender',
    };
    const errorOption: ComboboxItem = {
      key: 'errorText',
      value: 'errorText',
      disabled: true,
      displayName: errorDetails?.message ?? '',
      type: 'errorrender',
    };
    if (searchValue && typeof searchValue === 'string') {
      const newOptions = isLoading
        ? [loadingOption]
        : errorDetails
          ? [errorOption]
          : options.filter((option) => isComboboxItemMatch(option, searchValue));

      if (newOptions.length === 0) {
        const noValuesLabel = intl.formatMessage({
          defaultMessage: 'No values match your search.',
          id: '/KRvvg',
          description: 'Label for when no values match search value.',
        });
        newOptions.push({ key: 'header', value: noValuesLabel, disabled: true, displayName: noValuesLabel });
      }
      newOptions.push({ key: 'divider', value: '-', displayName: '-' });
      if (options.filter((option) => option.value === searchValue).length === 0 && searchValue !== '' && useOption) {
        const customValueLabel = intl.formatMessage(
          {
            defaultMessage: 'Use "{value}" as a custom value',
            id: 'VptXzY',
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
            <Spinner size={'extra-tiny'} label={item?.text} />
          </div>
        );
      default:
        return <span className="msla-combobox-option">{item?.text}</span>;
    }
  };

  const handleOptionSelect = (_event: FormEvent<IComboBox>, option?: IComboBoxOption): void => {
    if (option?.data === 'customrender') {
      setValue([createLiteralValueSegment(option.key === 'customValue' ? '' : String(option.key))]);
      setMode(Mode.Custom);
      setCanAutoFocus(true);
    } else if (setSelectedKey && option) {
      const currSelectedKey = String(option.key);
      setSelectedKey(currSelectedKey);
      setMode(Mode.Default);
      const selectedValue = getSelectedValue(options, currSelectedKey);
      const value = typeof selectedValue === 'object' ? JSON.stringify(selectedValue) : String(selectedValue);
      onChange?.({
        value: [createLiteralValueSegment(currSelectedKey ? value : '')],
      });
    }
  };

  const handleOptionMultiSelect = (_event: FormEvent<IComboBox>, option?: IComboBoxOption): void => {
    if (option?.data === 'customrender') {
      setValue([createLiteralValueSegment(option.key === 'customValue' ? '' : option.key.toString())]);
      setMode(Mode.Custom);
      setCanAutoFocus(true);
    } else if (option && selectedKeys) {
      const newKeys = option.selected ? [...selectedKeys, option.key as string] : selectedKeys.filter((key: string) => key !== option.key);
      setSelectedKeys(newKeys);
      setMode(Mode.Default);
      const selectedValues = newKeys.map((key) => getSelectedValue(options, key));
      onChange?.({
        value: [
          createLiteralValueSegment(
            serialization?.valueType === 'array' ? JSON.stringify(selectedValues) : selectedValues.join(serialization?.separator)
          ),
        ],
      });
    }
  };

  const clearEditor = intl.formatMessage({
    defaultMessage: 'Clear custom value',
    id: 'zUgja+',
    description: 'Label for button to clear the editor',
  });

  const handleClearClick = () => {
    setSelectedKey('');
    setSelectedKeys([]);
    setSearchValue('');
    comboBoxRef.current?.focus(true);
    setMode(Mode.Default);
    onChange?.({
      value: [createLiteralValueSegment('')],
    });
  };

  const handleBlur = () => {
    onChange?.({ value });
  };

  const handleComboBoxBlur = () => {
    setSearchValue('');
  };

  return (
    <div className="msla-combobox-container">
      {mode === Mode.Custom ? (
        <div className="msla-combobox-editor-container">
          <EditorWrapper
            labelId={labelId}
            readonly={baseEditorProps.readonly}
            className="msla-combobox-editor"
            basePlugins={{ clearEditor: true, autoFocus: canAutoFocus }}
            initialValue={value}
            onBlur={handleBlur}
            getTokenPicker={baseEditorProps.getTokenPicker}
            placeholder={baseEditorProps.placeholder}
            dataAutomationId={baseEditorProps.dataAutomationId}
            tokenMapping={baseEditorProps.tokenMapping}
            loadParameterValueFromString={baseEditorProps.loadParameterValueFromString}
          >
            <EditorChangePlugin setValue={setValue} />
          </EditorWrapper>
          <Tooltip relationship="label" content={clearEditor}>
            <Button
              aria-label={clearEditor}
              appearance="subtle"
              onClick={() => handleClearClick()}
              icon={<ClearIcon />}
              style={buttonStyles}
            />
          </Tooltip>
        </div>
      ) : (
        <ComboBox
          ariaLabel={label}
          className="msla-combobox"
          selectedKey={multiSelect ? selectedKeys : selectedKey}
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
          multiSelect={multiSelect}
          styles={comboboxStyles}
          onChange={multiSelect ? handleOptionMultiSelect : handleOptionSelect}
          onMenuOpen={handleMenuOpen}
          onBlur={handleComboBoxBlur}
        />
      )}
    </div>
  );
};
const getOptions = (options: ComboboxItem[]): IComboBoxOption[] => {
  const intl = getIntl();

  const customValueLabel = intl.formatMessage({
    defaultMessage: 'Enter custom value',
    id: 'vrYqUF',
    description: 'Label for button to allow user to create custom value in combobox',
  });

  const noOptionsExists = intl.formatMessage({
    defaultMessage: 'No items',
    id: 'tbl/ar',
    description: 'Label for when no items exist for combobox options',
  });

  return [
    ...(options.length > 0
      ? options.map((option: ComboboxItem) => {
          const { key, displayName, disabled, type } = option;
          switch (key) {
            case 'divider':
              return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Divider, disabled: disabled, data: type };
            case 'header':
              return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Header, data: type, disabed: disabled };
            default:
              return { key: key, text: displayName, disabled: disabled, data: type };
          }
        })
      : [{ key: 'noOptions', text: noOptionsExists, itemType: SelectableOptionMenuItemType.Header, disabled: true }]),
    { key: 'customValue', text: customValueLabel, styles: customValueStyles, data: 'customrender' },
  ];
};

const getMode = (selectedKey: string, selectedKeys: string[], initialValue: ValueSegment[], isLoading?: boolean): Mode => {
  if (isLoading) {
    return Mode.Default;
  }
  if (selectedKeys.length > 0) {
    for (const key of selectedKeys) {
      if (!isEmptySegments(initialValue) && !key) {
        return Mode.Custom;
      }
    }
    return Mode.Default;
  }
  return isEmptySegments(initialValue) ? Mode.Default : selectedKey ? Mode.Default : Mode.Custom;
};

const getSelectedKey = (options: ComboboxItem[], initialValue?: ValueSegment[], isLoading?: boolean, isCaseSensitive = false): string => {
  if (isLoading) {
    return '';
  }
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    return (
      options.find((option) => {
        return equals(normalizeValue(option.value), normalizeValue(initialValue[0].value), !isCaseSensitive);
      })?.key ?? ''
    );
  }
  return '';
};

const getSelectedKeys = (
  options: ComboboxItem[],
  initialValue?: ValueSegment[],
  serialization?: SerializationOptions,
  isCaseSensitive = false
): string[] => {
  const returnVal: string[] = [];
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    const value = initialValue[0].value;
    const selectedValues =
      serialization?.valueType === 'array'
        ? Array.isArray(value)
          ? value
          : JSON.parse(value || '[]')
        : value.split(serialization?.separator || ',');

    for (const selectedValue of selectedValues) {
      const option = options.find((option) => {
        return equals(normalizeValue(option.value), normalizeValue(selectedValue), !isCaseSensitive);
      });

      if (option) {
        returnVal.push(option.key);
      }
    }
  }
  return returnVal;
};

const getSelectedValue = (options: ComboboxItem[], key: string): any => {
  return options.find((option) => {
    return option.key === key;
  })?.value;
};

const normalizeValue = (value: any): string => {
  return typeof value !== 'string' ? JSON.stringify(value) : value;
};
