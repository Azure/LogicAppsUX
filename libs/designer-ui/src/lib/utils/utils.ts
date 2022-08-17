import Constants from '../constants';
import { getIntl } from '@microsoft-logic-apps/intl';
import { isBuiltInConnector } from '@microsoft-logic-apps/utils';

/**
 * Returns a string with a duration, possibly abbreviated, e.g., 15s or 15 second(s)
 * @arg {number} milliseconds - The number of milliseconds in the duration
 * @arg {boolean} [abbreviated=true] - True if the string should be abbreviated, e.g., "s" instead of "second(s)".
 * @return {string}
 */
export function getDurationString(milliseconds: number, abbreviated = true): string {
  const intl = getIntl();
  if (isNaN(milliseconds)) {
    return '--';
  }

  const seconds = Math.round(Math.abs(milliseconds / 1000));
  if (seconds < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds}s',
          description: 'This is a period in time in seconds. {seconds} is replaced by the number and s is an abbreviation of seconds',
        },
        {
          seconds,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
          description: 'A duration of time shown in seconds',
        },
        {
          seconds,
        }
      );
    }
  }

  const minutes = Math.round(Math.abs(milliseconds / 60 / 1000));
  if (minutes < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes}m',
          description: 'This is a period in time in seconds. {minutes} is replaced by the number and m is an abbreviation of minutes',
        },
        {
          minutes,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes, plural, one {# minute} other {# minutes}}',
          description: 'A duration of time shown in minutes',
        },
        {
          minutes,
        }
      );
    }
  }

  const hours = Math.round(Math.abs(milliseconds / 60 / 60 / 1000));
  if (hours < 24) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{hours}h',
          description: 'This is a period in time in hours. {hours} is replaced by the number and h is an abbreviation of hours',
        },
        {
          hours,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{hours, plural, one {# hour} other {# hours}}',
          description: 'A duration of time shown in hours',
        },
        {
          hours,
        }
      );
    }
  }

  const days = Math.round(Math.abs(milliseconds / 24 / 60 / 60 / 1000));
  if (abbreviated) {
    return intl.formatMessage(
      {
        defaultMessage: '{days}d',
        description: 'This is a period in time in days. {days} is replaced by the number and d is an abbreviation of days',
      },
      {
        days,
      }
    );
  } else {
    return intl.formatMessage(
      {
        defaultMessage: '{days, plural, one {# day} other {# days}}',
        description: 'A duration of time shown in days',
      },
      {
        days,
      }
    );
  }
}

/**
 * Returns a string with a duration, possibly abbreviated, e.g., 15s or 15 second(s)
 * @arg {number} milliseconds - The number of milliseconds in the duration
 * @arg {boolean} [abbreviated=true] - True if the string should be abbreviated, e.g., "s" instead of "second(s)".
 * @return {string}
 */
export function getDurationStringPanelMode(milliseconds: number, abbreviated = true): string {
  if (isNaN(milliseconds)) {
    return '--';
  }

  const intl = getIntl();
  if (milliseconds < 1000) {
    const millisecondsRounded = Math.round(Math.abs(milliseconds / 1000) * 10) / 10;
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds}s',
          description: 'This is a period in time in seconds. {seconds} is replaced by the number and s is an abbreviation of seconds',
        },
        {
          seconds: millisecondsRounded,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
          description: 'A duration of time shown in seconds',
        },
        {
          seconds: millisecondsRounded,
        }
      );
    }
  }

  const seconds = Math.round(Math.abs(milliseconds / 1000));
  if (seconds < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds}s',
          description: 'This is a period in time in seconds. {seconds} is replaced by the number and s is an abbreviation of seconds',
        },
        {
          seconds,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
          description: 'A duration of time shown in seconds',
        },
        {
          seconds,
        }
      );
    }
  }

  const minutes = Math.floor(Math.abs(milliseconds / 60 / 1000));
  const millisecondsCarry = Math.abs(milliseconds - minutes * 60 * 1000);
  const secondsCarry = Math.round(Math.abs(millisecondsCarry / 1000));
  if (minutes < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes}m {seconds}s',
          description: 'This is a time duration in abbreviated format',
        },
        {
          seconds: secondsCarry,
          minutes,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes} minutes {seconds} seconds',
          description: 'This is a time duration in full non abbreviated format',
        },
        {
          seconds: secondsCarry,
          minutes,
        }
      );
    }
  }

  const hours = Math.floor(Math.abs(milliseconds / 60 / 60 / 1000));
  const minutesCarry = Math.round(Math.abs(milliseconds - hours * 3600000) / 60 / 1000);
  if (hours < 24) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{hours}h {minutes}m',
          description: 'This is a time duration in abbreviated format',
        },
        {
          hours,
          minutes: minutesCarry,
        }
      );
    } else {
      return intl.formatMessage(
        {
          defaultMessage: '{hours} hours {minutes} minutes',
          description: 'This is a time duration in full non abbreviated format',
        },
        {
          hours,
          minutes: minutesCarry,
        }
      );
    }
  }

  const days = Math.floor(Math.abs(milliseconds / 24 / 60 / 60 / 1000));
  const hoursCarry = Math.round(Math.abs(milliseconds - days * 86400000) / 60 / 60 / 1000);
  if (abbreviated) {
    return intl.formatMessage(
      {
        defaultMessage: '{days}d {hours}h',
        description: 'This is a time duration in abbreviated format',
      },
      {
        hours: hoursCarry,
        days,
      }
    );
  } else {
    return intl.formatMessage(
      {
        defaultMessage: '{days} days {hours} hours',
        description: 'This is a time duration in full non abbreviated format',
      },
      {
        hours: hoursCarry,
        days,
      }
    );
  }
}

export function getStatusString(status: string, hasRetries: boolean): string {
  const intl = getIntl();
  switch (status) {
    case Constants.STATUS.ABORTED:
      return intl.formatMessage({
        defaultMessage: 'Aborted',

        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.CANCELLED:
      return intl.formatMessage({
        defaultMessage: 'Cancelled',

        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.FAILED:
      return intl.formatMessage({
        defaultMessage: 'Failed',
        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.FAULTED:
      return intl.formatMessage({
        defaultMessage: 'Faulted',
        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.IGNORED:
      return intl.formatMessage({
        defaultMessage: 'Ignored',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.SKIPPED:
      return intl.formatMessage({
        defaultMessage: 'Skipped',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.SUCCEEDED:
      return hasRetries
        ? intl.formatMessage({
            defaultMessage: 'Succeeded with retries',
            description:
              'This is a status message to be shown in a monitoring view. This refers to the succeeded status of a previous action.',
          })
        : intl.formatMessage({
            defaultMessage: 'Succeeded',
            description: 'This is a status message to be shown in a monitoring view',
          });

    case Constants.STATUS.TIMEDOUT:
      return intl.formatMessage({
        defaultMessage: 'Timed Out',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.WAITING:
      return intl.formatMessage({
        defaultMessage: 'Waiting',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.NOT_SPECIFIED:
    default:
      return intl.formatMessage({
        defaultMessage: 'Not specified',
        description: 'This is a status message to be shown in a monitoring view',
      });
  }
}

export const getIdLeaf = (id?: string): string => id?.split('/').at(-1) ?? '';

export const filterRecord = <T>(data: Record<string, T>, filter: (_key: string, _val: any) => boolean): Record<string, T> => {
  return Object.entries(data)
    .filter(([key, value]) => filter(key, value))
    .reduce((res: any, [key, value]: any) => ({ ...res, [key]: value }), {});
};

export const getConnectorCategoryString = (connectorId: string): string => {
  const intl = getIntl();
  const builtInText = intl.formatMessage({
    defaultMessage: 'Built-in',
    description: '"Built-in" category name',
  });
  const azureText = intl.formatMessage({
    defaultMessage: 'Azure',
    description: 'Azure name text (not sure if this changes in different languages)',
  });

  return isBuiltInConnector(connectorId) ? builtInText : azureText;
};
