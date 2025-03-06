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
    label: intl.formatMessage({ defaultMessage: 'Frequency', id: '7509a2f75a10', description: 'Label for Frequency' }),
    description: intl.formatMessage({ defaultMessage: 'Select frequency.', id: '02179730d648', description: 'Placeholder for Frequency' }),
  },
  interval: {
    label: intl.formatMessage({ defaultMessage: 'Interval', id: '5d54d04fa87d', description: 'Label for Interval' }),
    description: intl.formatMessage({ defaultMessage: 'Specify the interval.', id: 'f371b9aebf2e', description: 'Placeholder for Interval' }),
  },
  startTime: {
    label: intl.formatMessage({ defaultMessage: 'Start time', id: 'ea75909bb796', description: 'Label for Start time' }),
    description: intl.formatMessage({
      defaultMessage: 'Example: 2017-03-24T15:00:00Z',
      id: 'b546174404d8',
      description: 'Placeholder for Start time',
    }),
  },
  timezone: {
    label: intl.formatMessage({ defaultMessage: 'Time zone', id: 'fa9a307d75f1', description: 'Label for timezone' }),
    description: intl.formatMessage({ defaultMessage: 'Select timezone.', id: '13e8a29b8020', description: 'Placeholder for timezone' }),
  },
  hours: {
    label: intl.formatMessage({ defaultMessage: 'At these hours', id: '1a5e64870dff', description: 'Label for schedule hours' }),
    description: intl.formatMessage({ defaultMessage: 'Example: 0, 10', id: '89531502d70e', description: 'Placeholder for schedule hours' }),
  },
  minutes: {
    label: intl.formatMessage({ defaultMessage: 'At these minutes', id: '1126577c280d', description: 'Label for schedule minutes' }),
    description: intl.formatMessage({
      defaultMessage: 'Enter the valid minute values (from 0 to 59) separated by comma, e.g., 15,30',
      id: '1f659d899d33',
      description: 'Placeholder for schedule minutes',
    }),
  },
  days: {
    label: intl.formatMessage({ defaultMessage: 'On these days', id: '38839ec6812b', description: 'Label for schedule days' }),
    description: intl.formatMessage({
      defaultMessage: 'Example: Monday, Friday',
      id: '05281abea864',
      description: 'Placeholder for schedule days',
    }),
  },
};
