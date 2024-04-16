import type { Recurrence } from '.';
import type { ValueSegment } from '../editor';
import { getIntl } from '@microsoft/logic-apps-shared';

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
  }
  try {
    return Number.parseInt(value);
  } catch {
    return 0;
  }
};

const intl = getIntl();
export const resources = {
  frequency: {
    label: intl.formatMessage({ defaultMessage: 'Frequency', id: 'dQmi91', description: 'Label for Frequency' }),
    description: intl.formatMessage({ defaultMessage: 'Select frequency.', id: 'AheXMN', description: 'Placeholder for Frequency' }),
  },
  interval: {
    label: intl.formatMessage({ defaultMessage: 'Interval', id: 'XVTQT6', description: 'Label for Interval' }),
    description: intl.formatMessage({ defaultMessage: 'Specify the interval.', id: '83G5rr', description: 'Placeholder for Interval' }),
  },
  startTime: {
    label: intl.formatMessage({ defaultMessage: 'Start Time', id: '2kWLLc', description: 'Label for Start time' }),
    description: intl.formatMessage({
      defaultMessage: 'Example: 2017-03-24T15:00:00Z',
      id: 'tUYXRA',
      description: 'Placeholder for Start time',
    }),
  },
  timezone: {
    label: intl.formatMessage({ defaultMessage: 'Time zone', id: '+powfX', description: 'Label for timezone' }),
    description: intl.formatMessage({ defaultMessage: 'Select timezone.', id: 'E+iim4', description: 'Placeholder for timezone' }),
  },
  hours: {
    label: intl.formatMessage({ defaultMessage: 'At these hours', id: 'Gl5khw', description: 'Label for schedule hours' }),
    description: intl.formatMessage({ defaultMessage: 'Example: 0, 10', id: 'iVMVAt', description: 'Placeholder for schedule hours' }),
  },
  minutes: {
    label: intl.formatMessage({ defaultMessage: 'At these minutes', id: 'ESZXfC', description: 'Label for schedule minutes' }),
    description: intl.formatMessage({
      defaultMessage: 'Enter the valid minute values (from 0 to 59) separated by comma, e.g., 15,30',
      id: 'H2WdiZ',
      description: 'Placeholder for schedule minutes',
    }),
  },
  days: {
    label: intl.formatMessage({ defaultMessage: 'On these days', id: 'OIOexo', description: 'Label for schedule days' }),
    description: intl.formatMessage({
      defaultMessage: 'Example: Monday, Friday',
      id: 'BSgavq',
      description: 'Placeholder for schedule days',
    }),
  },
};
