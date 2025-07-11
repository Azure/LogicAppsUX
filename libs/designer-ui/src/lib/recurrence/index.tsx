import constants from '../constants';
import type { ValueSegment } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import { DropdownControl, DropdownType } from './dropdownControl';
import { Preview } from './preview';
import { MinuteTextInput, TextInput } from './textInput';
import { getIntervalValue, getRecurrenceValue, resources } from './util';
import {
  equals,
  getFrequencyValues,
  getScheduleDayValues,
  getScheduleHourValues,
  getTimezoneValues,
  RecurrenceType,
} from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useRecurrenceStyles } from './recurrence.styles';

export interface Recurrence {
  frequency: string | undefined;
  interval: number | undefined;
  startTime?: string;
  timeZone?: string;
  schedule?: {
    hours?: number[];
    minutes?: number[];
    weekDays?: string[];
  };
}

interface ScheduleEditorProps {
  type?: RecurrenceType;
  initialValue: ValueSegment[];
  onChange?: ChangeHandler;
  readOnly?: boolean;
  showPreview?: boolean;
}

export const ScheduleEditor = ({
  type = RecurrenceType.Basic,
  initialValue,
  readOnly,
  showPreview = false,
  onChange,
}: ScheduleEditorProps): JSX.Element => {
  const intl = useIntl();
  const styles = useRecurrenceStyles();
  const initialRecurrenceValue = getRecurrenceValue(initialValue);
  const [recurrence, setRecurrence] = useState<Recurrence>(initialRecurrenceValue);

  const updateRecurrence = (newRecurrence: Recurrence) => {
    if (!equals(JSON.stringify(newRecurrence), JSON.stringify(recurrence))) {
      setRecurrence(newRecurrence);
      onChange?.({ value: [createLiteralValueSegment(JSON.stringify(newRecurrence))] });
    }
  };

  const renderScheduleSection = (): JSX.Element | null => {
    const { frequency } = recurrence;

    if (equals(frequency, constants.FREQUENCY.DAY) || equals(frequency, constants.FREQUENCY.WEEK)) {
      return (
        <div>
          {equals(frequency, constants.FREQUENCY.WEEK) ? (
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
                  schedule: { ...recurrence.schedule, weekDays: (values as string[]).length ? (values as string[]) : undefined },
                })
              }
              readOnly={readOnly}
              type={DropdownType.Days}
            />
          ) : null}
          <DropdownControl
            label={resources.hours.label}
            required={false}
            options={getScheduleHourValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
            selectedKeys={recurrence?.schedule?.hours?.map((hour) => hour.toString())}
            placeholder={resources.hours.description}
            isMultiSelect={true}
            onChange={(values) => {
              const hours = Array.isArray(values)
                ? values.map((value) => Number.parseInt(value as string, 10)).filter(Number.isFinite)
                : undefined;
              updateRecurrence({
                ...recurrence,
                schedule: { ...recurrence.schedule, hours: hours?.length ? hours : undefined },
              });
            }}
            readOnly={readOnly}
            type={DropdownType.Hours}
          />
          <MinuteTextInput
            label={resources.minutes.label}
            required={false}
            initialValue={recurrence.schedule?.minutes?.toString()}
            placeholder={resources.minutes.description}
            onChange={(value) => {
              updateRecurrence({
                ...recurrence,
                schedule: { ...recurrence.schedule, minutes: value ? value : undefined },
              });
            }}
            readOnly={readOnly}
          />
          {showPreview ? <Preview recurrence={recurrence} /> : null}
        </div>
      );
    }
    return null;
  };

  const handleFrequencyUpdate = (frequency: string) => {
    const newRecurrence = { ...recurrence, frequency };
    const isDayFrequency = equals(frequency, constants.FREQUENCY.DAY);
    const isWeekFrequency = equals(frequency, constants.FREQUENCY.WEEK);
    if (!isDayFrequency && !isWeekFrequency) {
      delete newRecurrence.schedule;
    } else if (isDayFrequency) {
      delete newRecurrence.schedule?.weekDays;
    }

    updateRecurrence(newRecurrence);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.frequencyGroup}>
        <TextInput
          className={styles.intervalGroup}
          label={resources.interval.label}
          required={true}
          initialValue={recurrence.interval !== undefined ? recurrence?.interval?.toString() : ''}
          placeholder={resources.interval.description}
          onChange={(value) => updateRecurrence({ ...recurrence, interval: getIntervalValue(value) })}
          isInteger={true}
          readOnly={readOnly}
        />
        <DropdownControl
          className={styles.editorGroup}
          label={resources.frequency.label}
          required={true}
          options={getFrequencyValues(intl).map((option) => ({ key: option.value, text: option.displayName }))}
          selectedKey={recurrence.frequency}
          placeholder={resources.frequency.description}
          onChange={(value) => handleFrequencyUpdate(value as string)}
          readOnly={readOnly}
          type={DropdownType.Frequency}
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
        type={DropdownType.Timezone}
      />
      <TextInput
        label={resources.startTime.label}
        required={false}
        initialValue={recurrence.startTime}
        placeholder={resources.startTime.description}
        onChange={(value) => updateRecurrence({ ...recurrence, startTime: value ? value : undefined })}
        readOnly={readOnly}
      />
      {type === RecurrenceType.Advanced ? renderScheduleSection() : null}
    </div>
  );
};
