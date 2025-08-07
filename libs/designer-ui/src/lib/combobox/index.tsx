import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps, CallbackHandler } from '../editor/base';
import { EditorWrapper } from '../editor/base/EditorWrapper';
import { EditorChangePlugin } from '../editor/base/plugins/EditorChange';
import { createLiteralValueSegment, notEqual } from '../editor/base/utils/helper';
import { Combobox as FluentCombobox, Option, Button, Spinner, Tooltip, mergeClasses } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { equals, getIntl, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { isEmptySegments } from '../editor/base/utils/parsesegments';
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { isComboboxItemMatch } from './helpers/isComboboxItemMatch';
import { useComboboxStyles } from './styles';

const ClearIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

const LARGE_DATASET_THRESHOLD = 5000;
const ITEM_PERFORMANCE_THRESHOLD = 2000;

const Mode = {
  Default: 'Default',
  Custom: 'Custom',
} as const;
type Mode = (typeof Mode)[keyof typeof Mode];

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
  // Behavior
  isLoading?: boolean;
  multiSelect?: boolean;
  isCaseSensitive?: boolean;
  shouldSort?: boolean;
  useOption?: boolean;
  // Event Handlers
  onMenuOpen?: CallbackHandler;
  // Error Handling
  errorDetails?: { message: string };
  // Misc
  serialization?: SerializationOptions;
}

export const Combobox = ({
  initialValue,
  options,
  isLoading,
  multiSelect = false,
  isCaseSensitive,
  shouldSort = true,
  useOption = true,
  onChange,
  onMenuOpen,
  label,
  errorDetails,
  serialization,
  basePlugins,
  ...baseEditorProps
}: ComboboxProps): JSX.Element => {
  const intl = useIntl();
  const comboBoxRef = useRef<HTMLInputElement>(null);
  const optionKey = getSelectedKey(options, initialValue, isLoading, isCaseSensitive);
  const optionKeys = getSelectedKeys(options, initialValue, serialization, isCaseSensitive);
  const [value, setValue] = useState<ValueSegment[]>(initialValue);
  const [mode, setMode] = useState<Mode>(getMode(optionKey, optionKeys, initialValue, isLoading));
  const [selectedKey, setSelectedKey] = useState<string>(optionKey);
  const [selectedKeys, setSelectedKeys] = useState<string[] | undefined>(multiSelect ? optionKeys : undefined);
  const [searchValue, setSearchValue] = useState<string>('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState<string>('');
  const [canAutoFocus, setCanAutoFocus] = useState(false);
  const firstLoad = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if ((firstLoad.current || !errorDetails) && !isLoading) {
      firstLoad.current = false;
      const updatedOptionkey = getSelectedKey(options, initialValue, isLoading, isCaseSensitive);
      const updatedOptionKeys = getSelectedKeys(options, initialValue, serialization, isCaseSensitive);
      setSelectedKey(updatedOptionkey);
      setMode(getMode(updatedOptionkey, updatedOptionKeys, initialValue, isLoading));
    }
  }, [errorDetails, initialValue, isCaseSensitive, isLoading, options, serialization]);

  // Debounce search value to prevent excessive filtering
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue]);

  // Sort options alphabetically based on the `displayName` property
  const sortedOptions = useMemo(() => {
    if (!shouldSort || isLoading) {
      return options;
    }

    // For large datasets, skip sorting to prevent freezing
    if (options.length > ITEM_PERFORMANCE_THRESHOLD) {
      LoggerService().log({
        level: LogEntryLevel.Warning,
        area: 'Combobox:sortedOptions',
        message: 'Skipping sort for large dataset to prevent performance issues',
        args: [options.length],
      });
      return options;
    }

    // Create a shallow copy to avoid mutating the original array
    return [...options].sort((currentItem, nextItem) => {
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

    // Handle loading and error states
    if (isLoading) {
      return getOptions([loadingOption]);
    }
    if (errorDetails) {
      return getOptions([errorOption]);
    }

    // For large datasets, encourage users to search
    const isLargeDataset = sortedOptions.length > LARGE_DATASET_THRESHOLD;

    if (debouncedSearchValue && typeof debouncedSearchValue === 'string') {
      // For large datasets, use a more performance-friendly search approach
      let filteredOptions: ComboboxItem[] = [];

      if (isLargeDataset) {
        // For very large datasets, limit search results to prevent freezing
        let matchCount = 0;
        const maxResults = 200;
        // Use requestAnimationFrame to prevent blocking the UI
        for (let i = 0; i < sortedOptions.length && matchCount < maxResults; i++) {
          const option = sortedOptions[i];
          if (isComboboxItemMatch(option, debouncedSearchValue)) {
            filteredOptions.push(option);
            matchCount++;
          }
        }

        if (filteredOptions.length === maxResults) {
          const moreResultsLabel = intl.formatMessage(
            {
              defaultMessage: 'Showing first {count} matches. Type more to refine search...',
              id: '189xYn',
              description: 'Message when search results are limited',
            },
            { count: maxResults }
          );
          filteredOptions.unshift({
            key: 'more_results',
            value: moreResultsLabel,
            disabled: true,
            displayName: moreResultsLabel,
            type: 'header',
          });
        }
      } else {
        filteredOptions = sortedOptions.filter((option) => isComboboxItemMatch(option, debouncedSearchValue));
      }

      if (filteredOptions.length === 0) {
        const noValuesLabel = intl.formatMessage({
          defaultMessage: 'No values match your search.',
          id: '/KRvvg',
          description: 'Label for when no values match search value.',
        });
        filteredOptions.push({ key: 'header', value: noValuesLabel, disabled: true, displayName: noValuesLabel });
      }

      filteredOptions.push({ key: 'divider', value: '-', displayName: '-' });
      if (
        sortedOptions.filter((option) => option.value === debouncedSearchValue).length === 0 &&
        debouncedSearchValue !== '' &&
        useOption
      ) {
        const customValueLabel = intl.formatMessage(
          {
            defaultMessage: 'Use "{value}" as a custom value',
            id: 'VptXzY',
            description: 'Label for button to allow user to create custom value in combobox from current input',
          },
          { value: debouncedSearchValue }
        );
        filteredOptions.push({
          key: debouncedSearchValue,
          value: customValueLabel,
          displayName: customValueLabel,
          disabled: false,
          type: 'customrender',
        });
      }

      return getOptions(filteredOptions);
    }

    // For large datasets, encourage search and show limited initial items
    if (isLargeDataset) {
      const searchPromptLabel = intl.formatMessage(
        {
          defaultMessage: 'Type to search {options} items or scroll to see more...',
          id: 'c8dbb/',
          description: 'Prompt to encourage searching in large datasets',
        },
        {
          options: sortedOptions.length.toLocaleString(),
        }
      );

      const initialLimit = LARGE_DATASET_THRESHOLD; // Show items up to large dataset threshold
      const limitedOptions = [
        { key: 'search_prompt', value: searchPromptLabel, disabled: true, displayName: searchPromptLabel, type: 'header' },
        { key: 'divider', value: '-', displayName: '-' },
        ...sortedOptions.slice(0, initialLimit),
      ];

      // Add "show more" indicator if there are more items
      if (sortedOptions.length > initialLimit) {
        const remainingCount = sortedOptions.length - initialLimit;
        const moreItemsLabel = intl.formatMessage(
          {
            defaultMessage: '...and {count} more items. Type to search for specific items.',
            id: '8Ifvot',
            description: 'Message indicating more items are available',
          },
          { count: remainingCount.toLocaleString() }
        );
        limitedOptions.push({
          key: 'more_items',
          value: moreItemsLabel,
          disabled: true,
          displayName: moreItemsLabel,
          type: 'header',
        });
      }

      return getOptions(limitedOptions);
    }

    return getOptions(sortedOptions);
  }, [intl, errorDetails, debouncedSearchValue, isLoading, sortedOptions, useOption]);

  const toggleExpand = useCallback(() => {
    comboBoxRef.current?.focus();
  }, []);

  const handleMenuOpen = (): void => {
    onMenuOpen?.();
  };

  const updateOptions = useCallback((value?: string): void => {
    comboBoxRef.current?.focus();
    setSelectedKey('');
    setSearchValue(value ?? '');
  }, []);

  const onRenderOption = (item: ComboboxItem) => {
    switch (item?.type) {
      case 'customrender':
        return <span className={classes.customOption}>{item.displayName}</span>;
      case 'loadingrender':
        return (
          <div className={classes.loadingOption}>
            <Spinner size={'extra-tiny'} label={item.displayName} />
          </div>
        );
      default:
        return <span>{item.displayName}</span>;
    }
  };

  const handleOptionSelect = (optionValue: string): void => {
    const option = comboboxOptions.find((opt) => opt.key === optionValue);
    if (option?.type === 'customrender') {
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

  const handleOptionMultiSelect = (optionValue: string): void => {
    const option = comboboxOptions.find((opt) => opt.key === optionValue);
    if (option?.type === 'customrender') {
      setValue([createLiteralValueSegment(option.key === 'customValue' ? '' : option.key.toString())]);
      setMode(Mode.Custom);
      setCanAutoFocus(true);
    } else if (option && selectedKeys) {
      const isSelected = selectedKeys.includes(option.key);
      const newKeys = isSelected ? selectedKeys.filter((key: string) => key !== option.key) : [...selectedKeys, option.key as string];
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
    comboBoxRef.current?.focus();
    setMode(Mode.Default);
    onChange?.({
      value: [createLiteralValueSegment('')],
    });
  };

  const handleBlur = () => {
    if (notEqual(value, initialValue)) {
      onChange?.({ value });
    }
  };

  const handleComboBoxBlur = () => {
    setSearchValue('');
  };

  const classes = useComboboxStyles();

  return (
    <div className={mergeClasses(classes.container, baseEditorProps.className)}>
      {mode === Mode.Custom ? (
        <div className={classes.editorContainer}>
          <EditorWrapper
            {...baseEditorProps}
            className={classes.editor}
            basePlugins={{ clearEditor: true, autoFocus: canAutoFocus, ...basePlugins }}
            initialValue={value}
            onBlur={handleBlur}
            agentParameterButtonProps={{ ...baseEditorProps.agentParameterButtonProps, shifted: true }}
            tokenPickerButtonProps={{ verticalOffSet: 19.5 }}
          >
            <EditorChangePlugin setValue={setValue} />
          </EditorWrapper>
          <Tooltip relationship="label" content={clearEditor}>
            <Button
              aria-label={clearEditor}
              appearance="subtle"
              onClick={() => handleClearClick()}
              icon={<ClearIcon />}
              className={classes.clearButton}
              disabled={baseEditorProps.readonly}
            />
          </Tooltip>
        </div>
      ) : (
        <FluentCombobox
          aria-label={label}
          className={classes.combobox}
          value={searchValue || getDisplayValue(sortedOptions, selectedKey, selectedKeys || [], multiSelect)}
          selectedOptions={multiSelect ? selectedKeys || [] : selectedKey ? [selectedKey] : []}
          disabled={baseEditorProps.readonly}
          placeholder={baseEditorProps.placeholder}
          freeform
          multiselect={multiSelect}
          onInput={(event) => updateOptions((event.target as HTMLInputElement).value)}
          onClick={toggleExpand}
          onOptionSelect={(_event, data) => {
            if (data.optionValue) {
              multiSelect ? handleOptionMultiSelect(data.optionValue) : handleOptionSelect(data.optionValue);
            }
          }}
          onOpenChange={(event, data) => {
            if (data.open) {
              handleMenuOpen();
            } else {
              handleComboBoxBlur();
            }
          }}
          ref={comboBoxRef}
        >
          {comboboxOptions.map((option) => {
            if (option.key === 'divider') {
              return <hr key={option.key} className={classes.divider} />;
            }
            if (option.key === 'header') {
              return (
                <div key={option.key} className={classes.header}>
                  {option.displayName}
                </div>
              );
            }

            return (
              <Option key={option.key} value={option.key} text={option.displayName} disabled={option.disabled}>
                {onRenderOption(option)}
              </Option>
            );
          })}
        </FluentCombobox>
      )}
    </div>
  );
};

const getOptions = (options: ComboboxItem[]): ComboboxItem[] => {
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
      ? options
      : [{ key: 'noOptions', value: noOptionsExists, disabled: true, displayName: noOptionsExists, type: 'header' }]),
    { key: 'customValue', value: customValueLabel, displayName: customValueLabel, type: 'customrender' },
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

const getDisplayValue = (options: ComboboxItem[], selectedKey: string, selectedKeys: string[] = [], multiSelect: boolean): string => {
  if (multiSelect && selectedKeys.length > 0) {
    return selectedKeys
      .map((key) => options.find((opt) => opt.key === key)?.displayName)
      .filter(Boolean)
      .join(', ');
  }

  if (selectedKey) {
    return options.find((opt) => opt.key === selectedKey)?.displayName || '';
  }

  return '';
};

const normalizeValue = (value: any): string => {
  return typeof value !== 'string' ? JSON.stringify(value) : value;
};
