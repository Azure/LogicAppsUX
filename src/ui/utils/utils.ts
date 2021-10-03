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
    return intl.formatMessage(
      {
        defaultMessage: '{abbreviated, select, true {{seconds}s} other {{seconds, plural, one {# second} other {# seconds}}}}',
        id: 'GkLuvC',
        description:
          'This is duration of time string where there is less than 60 seconds, based on the {abbreviated} property the seconds will either be spelled out fully or abbreviated to "s" in english',
      },
      {
        seconds,
        abbreviated,
      }
    );
  }

  const minutes = Math.round(Math.abs(milliseconds / 60 / 1000));
  if (minutes < 60) {
    return intl.formatMessage(
      {
        defaultMessage: '{abbreviated, select, true {{minutes}s} other {{minutes, plural, one {# minute} other {# minutes}}}}',
        id: 'ryHyLO',
        description:
          'This is duration of time string where there is less than 60 minutes, based on the {abbreviated} property the minutes will either be spelled out fully or abbreviated to "m" in english',
      },
      {
        minutes,
        abbreviated,
      }
    );
  }

  const hours = Math.round(Math.abs(milliseconds / 60 / 60 / 1000));
  if (hours < 24) {
    return intl.formatMessage(
      {
        defaultMessage: '{abbreviated, select, true {{hours}s} other {{hours, plural, one {# hour} other {# hours}}}}',
        id: 'N3U8r2',
        description:
          'This is duration of time string where there is less than 24 hours, based on the {abbreviated} property the hours will either be spelled out fully or abbreviated to "h" in english',
      },
      {
        hours,
        abbreviated,
      }
    );
  }

  const days = Math.round(Math.abs(milliseconds / 24 / 60 / 60 / 1000));
  return intl.formatMessage(
    {
      defaultMessage: '{abbreviated, select, true {{days}s} other {{days, plural, one {# day} other {# days}}}}',
      id: 'qTTNl2',
      description:
        'This is duration of time string where there is greater than 1 day, based on the {abbreviated} property the days will either be spelled out fully or abbreviated to "d" in english',
    },
    {
      days,
      abbreviated,
    }
  );
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
    return intl.formatMessage(
      {
        defaultMessage: '{abbreviated, select, true {{seconds}s} other {{seconds, plural, one {# second} other {# seconds}}}}',
        id: 'GkLuvC',
        description:
          'This is duration of time string where there is less than 60 seconds, based on the {abbreviated} property the seconds will either be spelled out fully or abbreviated to "s" in english',
      },
      {
        seconds: millisecondsRounded,
        abbreviated,
      }
    );
  }

  const seconds = Math.round(Math.abs(milliseconds / 1000));
  if (seconds < 60) {
    return intl.formatMessage(
      {
        defaultMessage: '{abbreviated, select, true {{seconds}s} other {{seconds, plural, one {# second} other {# seconds}}}}',
        id: 'GkLuvC',
        description:
          'This is duration of time string where there is less than 60 seconds, based on the {abbreviated} property the seconds will either be spelled out fully or abbreviated to "s" in english',
      },
      {
        seconds: seconds,
        abbreviated,
      }
    );
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
          defaultMessage:
            '{minutes, plural, one {# minute {seconds, plural, one {# second} other {# seconds}}} other {# minutes {seconds, plural, one {# second} other {# seconds}}}}',
          id: 's9Rf50',
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
          defaultMessage:
            '{hours, plural, one {# hour {minutes, plural, one {# minute} other {# minutes}}} other {# hours {minutes, plural, one {# minute} other {# minutes}}}}',
          id: 'UWI7IQ',
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
        defaultMessage:
          '{days, plural, one {# day {hours, plural, one {# hour} other {# hours}}} other {# days {hours, plural, one {# hour} other {# hours}}}}',
        id: 'rlwTNl',
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
