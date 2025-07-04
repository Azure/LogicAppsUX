import type { Recurrence } from '.';
import constants from '../constants';
import { getIntl, equals, getPropertyValue } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useRecurrenceStyles } from './recurrence.styles';
import { mergeClasses } from '@fluentui/react-components';

interface PreviewProps {
  recurrence: Recurrence;
}

export const Preview = ({ recurrence }: PreviewProps): JSX.Element => {
  const intl = useIntl();
  const styles = useRecurrenceStyles();
  const { frequency, interval, schedule, startTime } = recurrence;
  const previewTitle = intl.formatMessage({ defaultMessage: 'Preview', id: 'MCzWDc', description: 'Recurrence preview title' });
  const scheduleHours = (schedule?.hours ?? []).map((hour) => {
    return hour;
  });

  // Check if dark theme is active
  const isDarkTheme = document.querySelector('.msla-theme-dark') !== null;

  return (
    <>
      {frequency && interval ? (
        <div className={mergeClasses(styles.preview, isDarkTheme && styles.previewDark)}>
          <div className={styles.previewTitle}>{previewTitle}</div>
          <div className={styles.previewContent}>
            {convertRecurrenceToExpression(
              frequency,
              interval,
              schedule?.weekDays,
              scheduleHours as number[],
              schedule?.minutes,
              getMinuteValueFromDatetimeString(startTime),
              styles
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

const convertRecurrenceToExpression = (
  frequency: string,
  interval: number,
  weekdays?: string[],
  hours?: number[],
  minutes?: number[],
  startMinute?: number,
  styles?: any
): JSX.Element => {
  const intl = getIntl();
  let frequencyDesc: string | undefined;
  if (interval > 1) {
    if (equals(frequency, constants.FREQUENCY.WEEK)) {
      frequencyDesc = intl.formatMessage(
        {
          defaultMessage: 'Every {interval} weeks',
          id: 'Umpr3z',
          description: 'Recurrence schedule description every interval weeks',
        },
        { interval }
      );
    } else if (equals(frequency, constants.FREQUENCY.DAY)) {
      frequencyDesc = intl.formatMessage(
        {
          defaultMessage: 'Every {interval} days',
          id: 'Ea/fr+',
          description: 'Recurrence schedule description every interval days',
        },
        { interval }
      );
    }
  } else if (equals(frequency, constants.FREQUENCY.WEEK)) {
    frequencyDesc = intl.formatMessage({
      defaultMessage: 'every week',
      id: 'DWd9vy',
      description: 'Recurrence schedule description every week',
    });
  } else if (equals(frequency, constants.FREQUENCY.DAY)) {
    frequencyDesc = intl.formatMessage({
      defaultMessage: 'every day',
      id: '0vfdFS',
      description: 'Recurrence schedule description every day',
    });
  }
  let onDays: string | undefined;
  if (frequencyDesc) {
    if (weekdays?.length && equals(frequency, constants.FREQUENCY.WEEK)) {
      const weekDays = weekdays.sort(byISOOrder).join(', ');
      onDays = intl.formatMessage(
        {
          defaultMessage: 'on {weekDays} {frequencyDesc}',
          id: 'TZh8nV',
          description: 'Recurrence schedule description on days of week',
        },
        { weekDays, frequencyDesc }
      );
    } else {
      onDays = frequencyDesc;
    }
  }

  let onTime: string | undefined;
  if (hours && hours.length && minutes && minutes.length) {
    const projectTimes: string[] = [];
    for (const hour of [...hours].sort(byNumber)) {
      for (const minute of [...minutes].sort(byNumber)) {
        projectTimes.push(`${hour}:${String(minute).padStart(2, '0')}`);
      }
    }

    onTime = intl.formatMessage(
      { defaultMessage: 'at {times}', id: 'Czt6YV', description: 'Recurrence schedule description at times' },
      { times: projectTimes.join(', ') }
    );
  } else if (hours && hours.length) {
    const projectTimes: string[] = [];
    for (const hour of [...hours].sort(byNumber)) {
      projectTimes.push(`${hour}:${String(startMinute ?? 'xx').padStart(2, '0')}`);
    }

    onTime = intl.formatMessage(
      { defaultMessage: 'at {times}', id: 'Czt6YV', description: 'Recurrence schedule description at times' },
      { times: projectTimes.join(', ') }
    );
  } else if (minutes && minutes.length) {
    const projectTimes: string[] = [];
    for (const minute of [...minutes].sort(byNumber)) {
      projectTimes.push(`00:${String(minute).padStart(2, '0')}`);
    }

    onTime = intl.formatMessage(
      { defaultMessage: 'at {times} every hour', id: 'tWV2mC', description: 'Recurrence schedule description at times' },
      { times: projectTimes.join(', ') }
    );
  }

  let summary: string;
  if (onTime && onDays) {
    summary = intl.formatMessage(
      { defaultMessage: 'Runs {onTime} {onDays}', id: 'U4zovj', description: 'Recurrence schedule description on days of week at times' },
      { onTime, onDays }
    );
  } else if (onTime) {
    summary = intl.formatMessage(
      { defaultMessage: 'Runs {onTime}', id: 'PNk3n4', description: 'Recurrence schedule description on days of week at times' },
      { onTime }
    );
  } else {
    summary = intl.formatMessage(
      { defaultMessage: 'Runs {onDays}', id: '4D7H4R', description: 'Recurrence schedule description on days of week at times' },
      { onDays }
    );
  }
  const noMinuteOrStartTimeWarning = intl.formatMessage({
    defaultMessage:
      "If a recurrence doesn't specify a specific start date and time, the first recurrence runs immediately when you save or deploy the logic app",
    id: 'hhW/w8',
    description: 'Recurrence additional message if no minutes or starttime is specified',
  });
  return (
    <div className={styles?.friendlyDesc}>
      {summary}
      {(!minutes || !minutes.length) && !startMinute && <div className={styles?.warningMessage}>{noMinuteOrStartTimeWarning}</div>}
    </div>
  );
};

const ISO_DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

function byISOOrder(a: string, b: string): number {
  const aOrdinal = getPropertyValue(ISO_DAY_ORDER, a);
  const bOrdinal = getPropertyValue(ISO_DAY_ORDER, b);
  if (aOrdinal < bOrdinal) {
    return -1;
  }
  if (aOrdinal > bOrdinal) {
    return 1;
  }
  return 0;
}

function byNumber(a: number, b: number): number {
  const aNumber = Number(a);
  const bNumber = Number(b);

  if (aNumber < bNumber) {
    return -1;
  }
  if (aNumber > bNumber) {
    return 1;
  }
  return 0;
}

const getMinuteValueFromDatetimeString = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  let date: Date;
  const dateTimeInNumber = Date.parse(value);
  if (!Number.isNaN(dateTimeInNumber)) {
    date = new Date(dateTimeInNumber);
    return date.getMinutes();
  }

  return undefined;
};
