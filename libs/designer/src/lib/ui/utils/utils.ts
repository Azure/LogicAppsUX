import Constants from '../constants';
import { getIntl } from '../../common/i18n/intl';
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
          id: 'iql+jn',
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
          id: 'hN7iBP',
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
          id: 'SXb47U',
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
          id: 'RhH4pF',
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
          id: 'Qu1HkA',
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
          id: 'FXLR5M',
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
        id: 'YIBDSH',
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
        id: 'qUWBUX',
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
          id: 'iql+jn',
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
          id: 'hN7iBP',
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
          id: 'iql+jn',
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
          id: 'hN7iBP',
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
          id: 'kHcCxH',
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
          defaultMessage: '{minutes}minutes {seconds}seconds',
          id: 'ozs7Yp',
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
          id: 'Oib1mL',
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
          defaultMessage: '{hours}hours {minutes}minutes',
          id: '5ilpFw',
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
        id: 'tImHz/',
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
        defaultMessage: '{days}days {hours}hours',
        id: '3V6GkP',
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
        id: 'PaPPLr',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.CANCELLED:
      return intl.formatMessage({
        defaultMessage: 'Cancelled',
        id: 'cj+kyo',
        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.FAILED:
      return intl.formatMessage({
        defaultMessage: 'Failed',
        id: 'T8Xqt9',
        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.FAULTED:
      return intl.formatMessage({
        defaultMessage: 'Faulted',
        id: '3kI7xF',
        description: 'This is a status message to be shown in a monitoring view',
      });
    case Constants.STATUS.IGNORED:
      return intl.formatMessage({
        defaultMessage: 'Ignored',
        id: 'ftwXvc',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.SKIPPED:
      return intl.formatMessage({
        defaultMessage: 'Skipped',
        id: 'k41+13',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.SUCCEEDED:
      return hasRetries
        ? intl.formatMessage({
            defaultMessage: 'Succeeded with retries',
            id: '0ZlNtf',
            description:
              'This is a status message to be shown in a monitoring view. This refers to the succeeded status of a previous action.',
          })
        : intl.formatMessage({
            defaultMessage: 'Succeeded',
            id: 'PF87Ew',
            description: 'This is a status message to be shown in a monitoring view',
          });

    case Constants.STATUS.TIMEDOUT:
      return intl.formatMessage({
        defaultMessage: 'Timed Out',
        id: 'wHYQyg',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.WAITING:
      return intl.formatMessage({
        defaultMessage: 'Waiting',
        id: '/NDLmg',
        description: 'This is a status message to be shown in a monitoring view',
      });

    case Constants.STATUS.NOT_SPECIFIED:
    default:
      return intl.formatMessage({
        defaultMessage: 'Not specified',
        id: 'e4Onhn',
        description: 'This is a status message to be shown in a monitoring view',
      });
  }
}
