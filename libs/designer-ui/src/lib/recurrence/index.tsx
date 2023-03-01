import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import type { ITextFieldStyles } from '@fluentui/react';
import { css, FontSizes, Label, TextField } from '@fluentui/react';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { getIntl } from '@microsoft/intl-logic-apps';
import {
  equals,
  getFrequencyValues,
  getScheduleDayValues,
  getScheduleHourValues,
  getTimezoneValues,
  guid,
  RecurrenceType,
} from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const intl = getIntl();
const resources = {
  frequency: {
    label: intl.formatMessage({ defaultMessage: 'Frequency', description: 'Label for Frequency' }),
    description: intl.formatMessage({ defaultMessage: 'Select frequency.', description: 'Placeholder for Frequency' }),
  },
  interval: {
    label: intl.formatMessage({ defaultMessage: 'Interval', description: 'Label for Interval' }),
    description: intl.formatMessage({ defaultMessage: 'Specify the interval.', description: 'Placeholder for Interval' }),
  },
  startTime: {
    label: intl.formatMessage({ defaultMessage: 'Start Time', description: 'Label for Start time' }),
    description: intl.formatMessage({ defaultMessage: 'Example: 2017-03-24T15:00:00Z', description: 'Placeholder for Start time' }),
  },
  timezone: {
    label: intl.formatMessage({ defaultMessage: 'Time Zone', description: 'Label for timezone' }),
    description: intl.formatMessage({ defaultMessage: 'Select timezone.', description: 'Placeholder for timezone' }),
  },
  hours: {
    label: intl.formatMessage({ defaultMessage: 'At these hours', description: 'Label for schedule hours' }),
    description: intl.formatMessage({ defaultMessage: 'Example: 0, 10', description: 'Placeholder for schedule hours' }),
  },
  minutes: {
    label: intl.formatMessage({ defaultMessage: 'At these minutes', description: 'Label for schedule minutes' }),
    description: intl.formatMessage({
      defaultMessage: 'Enter the valid minute values (from 0 to 59) separated by comma, e.g., 15,30',
      description: 'Placeholder for schedule minutes',
    }),
  },
  days: {
    label: intl.formatMessage({ defaultMessage: 'On these days', description: 'Label for schedule days' }),
    description: intl.formatMessage({ defaultMessage: 'Example: Monday, Friday', description: 'Placeholder for schedule days' }),
  },
};

interface ScheduleEditorProps {
  type: RecurrenceType;
  initialValue: ValueSegment[];
  onChange?: ChangeHandler;
  readOnly?: boolean;
}

export const ScheduleEditor = ({ type = RecurrenceType.Basic, initialValue, onChange, readOnly }: ScheduleEditorProps): JSX.Element => {
  const intl = useIntl();
  const [recurrence, setRecurrence] = useState<Recurrence>(getRecurrenceValue(initialValue));

  const updateRecurrence = (newRecurrence: Recurrence) => {
    setRecurrence(newRecurrence);
    onChange?.({ value: [{ id: guid(), type: ValueSegmentType.LITERAL, value: JSON.stringify(newRecurrence) }] });
  };

  const renderScheduleSection = (): JSX.Element | null => {
    const { frequency } = recurrence;
    if (equals(frequency, 'day') || equals(frequency, 'week')) {
      return (
        <div>
          {equals(frequency, 'week') ? (
            <DropdownControl
              label={resources.days.label}
              required={false}
              options={getScheduleDayValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
              selectedKeys={recurrence.schedule?.weekDays}
              placeholder={resources.days.description}
              isMultiSelect={true}
              onChange={(values) =>
                updateRecurrence({
                  ...recurrence,
                  schedule: { ...recurrence.schedule, weekDays: !(values as string[]).length ? undefined : (values as string[]) },
                })
              }
              readOnly={readOnly}
            />
          ) : null}
          <DropdownControl
            label={resources.hours.label}
            required={false}
            options={getScheduleHourValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
            selectedKeys={recurrence.schedule?.hours}
            placeholder={resources.hours.description}
            isMultiSelect={true}
            onChange={(values) =>
              updateRecurrence({
                ...recurrence,
                schedule: { ...recurrence.schedule, hours: !(values as string[]).length ? undefined : (values as string[]) },
              })
            }
            readOnly={readOnly}
          />
          <TextInput
            label={resources.minutes.label}
            required={false}
            initialValue={recurrence.schedule?.minutes}
            placeholder={resources.minutes.description}
            onChange={(value) =>
              updateRecurrence({
                ...recurrence,
                schedule: { ...recurrence.schedule, minutes: !value ? undefined : value },
              })
            }
            readOnly={readOnly}
          />
        </div>
      );
    } else {
      return null;
    }
  };

  const handleFrequencyUpdate = (frequency: string) => {
    const newRecurrence = { ...recurrence, frequency };
    const isDayFrequency = equals(frequency, 'day');
    const isWeekFrequency = equals(frequency, 'week');
    if (!isDayFrequency && !isWeekFrequency) {
      delete newRecurrence.schedule;
    } else if (isDayFrequency) {
      delete newRecurrence.schedule?.weekDays;
    }

    updateRecurrence(newRecurrence);
  };

  return (
    <div className="msla-recurrence-editor">
      <div className="msla-recurrence-editor-frequency-group">
        <TextInput
          className={css('msla-recurrence-editor-group', 'msla-recurrence-editor-interval')}
          label={resources.interval.label}
          required={true}
          initialValue={recurrence.interval !== undefined ? recurrence.interval.toString() : ''}
          placeholder={resources.interval.description}
          onChange={(value) => updateRecurrence({ ...recurrence, interval: getIntervalValue(value) })}
          readOnly={readOnly}
        />
        <DropdownControl
          className={'msla-recurrence-editor-group'}
          label={resources.frequency.label}
          required={true}
          options={getFrequencyValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
          selectedKey={recurrence.frequency}
          placeholder={resources.frequency.description}
          onChange={(value) => handleFrequencyUpdate(value as string)}
          readOnly={readOnly}
        />
      </div>
      <DropdownControl
        label={resources.timezone.label}
        required={false}
        options={getTimezoneValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
        selectedKey={recurrence.timeZone}
        placeholder={resources.timezone.description}
        onChange={(value) => updateRecurrence({ ...recurrence, timeZone: (value as string) ?? undefined })}
        readOnly={readOnly}
      />
      <TextInput
        label={resources.startTime.label}
        required={false}
        initialValue={recurrence.startTime}
        placeholder={resources.startTime.description}
        onChange={(value) => updateRecurrence({ ...recurrence, startTime: !value ? undefined : value })}
        readOnly={readOnly}
      />
      {type === RecurrenceType.Advanced ? renderScheduleSection() : null}
    </div>
  );
};

interface TextProps {
  label: string;
  required: boolean;
  initialValue: string | undefined;
  placeholder: string;
  onChange: (newValue: string) => void;
  className?: string;
  readOnly?: boolean;
}

const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { height: 28, width: '100%' },
  wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center' },
};

const TextInput = ({ label, required, initialValue, placeholder, onChange, className, readOnly }: TextProps): JSX.Element => {
  const [value, setValue] = useState<string | undefined>(initialValue);

  return (
    <div className={className}>
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={required}>
          {label}
        </Label>
      </div>
      <TextField
        ariaLabel={label}
        value={value}
        placeholder={placeholder}
        styles={textFieldStyles}
        readOnly={readOnly}
        onChange={(_, value) => setValue(value)}
        onBlur={() => onChange(value ?? '')}
      />
    </div>
  );
};

interface DropdownProps {
  label: string;
  required: boolean;
  selectedKey?: string | undefined;
  selectedKeys?: string[] | undefined;
  options: IDropdownOption<any>[];
  placeholder: string;
  onChange: (selectedValues: string[] | string) => void;
  isMultiSelect?: boolean;
  className?: string;
  readOnly?: boolean;
}

const dropdownStyle: Partial<IDropdownStyles> = {
  caretDown: {
    fontSize: FontSizes.icon,
    lineHeight: '24px',
    right: '10px',
  },
  dropdownOptionText: {
    fontSize: FontSizes.medium,
  },
  title: {
    border: '1px solid #989898',
    fontSize: FontSizes.medium,
    height: '28px',
    lineHeight: '26px',
  },
  root: {
    height: '28px',
  },
};

const DropdownControl = ({
  label,
  required,
  selectedKey,
  selectedKeys,
  placeholder,
  options,
  onChange,
  readOnly,
  isMultiSelect,
  className,
}: DropdownProps): JSX.Element => {
  const [selectedOption, setSelectedOption] = useState<string | undefined>(selectedKey);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(selectedKeys ?? []);
  const handleOptionSelect = (_: React.FormEvent, option?: IDropdownOption<string>) => {
    if (isMultiSelect) {
      const newKeys = option?.selected
        ? [...selectedOptions, option.key as string]
        : selectedOptions.filter((key: string) => key !== option?.key);
      setSelectedOptions(newKeys);
      onChange(newKeys);
    } else {
      if (option) {
        setSelectedOption(option.key as string);
        onChange(option.key as string);
      }
    }
  };

  return (
    <div className={className}>
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={required}>
          {label}
        </Label>
      </div>
      <Dropdown
        styles={dropdownStyle}
        selectedKey={selectedOption}
        selectedKeys={selectedOptions}
        placeholder={placeholder}
        disabled={readOnly}
        ariaLabel={label}
        options={options}
        className={css('msla-authentication-dropdown')}
        multiSelect={isMultiSelect}
        onChange={handleOptionSelect}
      />
    </div>
  );
};

interface Recurrence {
  frequency: string | undefined;
  interval: number | undefined;
  startTime?: string;
  timeZone?: string;
  schedule?: {
    hours?: string[];
    minutes?: string;
    weekDays?: string[];
  };
}

const getRecurrenceValue = (value: ValueSegment[]): Recurrence => {
  const recurrenceValue = value[0].value;

  if (!recurrenceValue) {
    return { frequency: undefined, interval: undefined };
  }

  return typeof recurrenceValue === 'string' ? JSON.parse(recurrenceValue) : recurrenceValue;
};

const getIntervalValue = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  } else {
    try {
      return parseInt(value);
    } catch {
      return 0;
    }
  }
};
