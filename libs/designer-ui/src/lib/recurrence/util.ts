import type { Recurrence } from '.';
import type { ValueSegment } from '../editor';
import { getIntl } from '@microsoft/intl-logic-apps';

export const getRecurrenceValue = (value: ValueSegment[]): Recurrence => {
  const recurrenceValue = value[0].value;

  if (!recurrenceValue) {
    return { frequency: undefined, interval: undefined };
  }

  return typeof recurrenceValue === 'string' ? JSON.parse(recurrenceValue) : recurrenceValue;
};

export const getIntervalValue = (value: string | undefined): number | undefined => {
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

const intl = getIntl();
export const resources = {
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
