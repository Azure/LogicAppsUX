import { isBuiltInConnector, isCustomConnector, isPremiumConnector } from '../connectors';
import Constants from '../constants';
import type { Connector, OperationApi } from '@microsoft/logic-apps-shared';
import { equals, getIntl } from '@microsoft/logic-apps-shared';

/**
 * Returns a string with a duration, possibly abbreviated, e.g., 15s or 15 second(s)
 * @arg {number} milliseconds - The number of milliseconds in the duration
 * @arg {boolean} [abbreviated=true] - True if the string should be abbreviated, e.g., "s" instead of "second(s)".
 * @return {string}
 */
export function getDurationString(milliseconds: number, abbreviated = true): string {
  const intl = getIntl();
  if (Number.isNaN(milliseconds)) {
    return '--';
  }

  const seconds = Math.round(Math.abs(milliseconds / 100)) / 10;
  if (seconds < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{seconds}s',
          id: '8aa97e8e710a',
          description: 'This is a period in time in seconds. {seconds} is replaced by the number and s is an abbreviation of seconds',
        },
        {
          seconds,
        }
      );
    }
    return intl.formatMessage(
      {
        defaultMessage: '{seconds, plural, one {# second} other {# seconds}}',
        id: '84dee204f005',
        description: 'A duration of time shown in seconds',
      },
      {
        seconds,
      }
    );
  }

  const minutes = Math.round(Math.abs(milliseconds / 60 / 1000));
  if (minutes < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes}m',
          id: '4976f8ed4f97',
          description: 'This is a period in time in seconds. {minutes} is replaced by the number and m is an abbreviation of minutes',
        },
        {
          minutes,
        }
      );
    }
    return intl.formatMessage(
      {
        defaultMessage: '{minutes, plural, one {# minute} other {# minutes}}',
        id: '4611f8a45d22',
        description: 'A duration of time shown in minutes',
      },
      {
        minutes,
      }
    );
  }

  const hours = Math.round(Math.abs(milliseconds / 60 / 60 / 1000));
  if (hours < 24) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{hours}h',
          id: '42ed4790031d',
          description: 'This is a period in time in hours. {hours} is replaced by the number and h is an abbreviation of hours',
        },
        {
          hours,
        }
      );
    }
    return intl.formatMessage(
      {
        defaultMessage: '{hours, plural, one {# hour} other {# hours}}',
        id: '1572d1e4c0f8',
        description: 'A duration of time shown in hours',
      },
      {
        hours,
      }
    );
  }

  const days = Math.round(Math.abs(milliseconds / 24 / 60 / 60 / 1000));
  if (abbreviated) {
    return intl.formatMessage(
      {
        defaultMessage: '{days}d',
        id: '608043487cdc',
        description: 'This is a period in time in days. {days} is replaced by the number and d is an abbreviation of days',
      },
      {
        days,
      }
    );
  }
  return intl.formatMessage(
    {
      defaultMessage: '{days, plural, one {# day} other {# days}}',
      id: 'a94581517c9e',
      description: 'A duration of time shown in days',
    },
    {
      days,
    }
  );
}

/**
 * Returns a string with a duration, possibly abbreviated, e.g., 15s or 15 second(s)
 * @arg {string} startTime - The start time of the duration
 * @arg {string} endTime - The end time of the duration
 * @arg {boolean} [abbreviated=true] - True if the string should be abbreviated, e.g., "s" instead of "second(s)".
 */
export function getDurationStringFromTimes(startTime: string, endTime: string, abbreviated = true): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = end.getTime() - start.getTime();
  return getDurationString(duration, abbreviated);
}

/**
 * Returns a string with a duration, possibly abbreviated, e.g., 15s or 15 second(s)
 * @arg {number} milliseconds - The number of milliseconds in the duration
 * @arg {boolean} [abbreviated=true] - True if the string should be abbreviated, e.g., "s" instead of "second(s)".
 * @return {string}
 */
export function getDurationStringPanelMode(milliseconds: number, abbreviated = true): string {
  if (Number.isNaN(milliseconds)) {
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
    }
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
    }
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

  const minutes = Math.floor(Math.abs(milliseconds / 60 / 1000));
  const millisecondsCarry = Math.abs(milliseconds - minutes * 60 * 1000);
  const secondsCarry = Math.round(Math.abs(millisecondsCarry / 1000));
  if (minutes < 60) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{minutes}m {seconds}s',
          id: '907702c47de0',
          description: 'This is a time duration in abbreviated format',
        },
        {
          seconds: secondsCarry,
          minutes,
        }
      );
    }
    return intl.formatMessage(
      {
        defaultMessage: '{minutes} minutes {seconds} seconds',
        id: '5d3bb1987598',
        description: 'This is a time duration in full non abbreviated format',
      },
      {
        seconds: secondsCarry,
        minutes,
      }
    );
  }

  const hours = Math.floor(Math.abs(milliseconds / 60 / 60 / 1000));
  const minutesCarry = Math.round(Math.abs(milliseconds - hours * 3600000) / 60 / 1000);
  if (hours < 24) {
    if (abbreviated) {
      return intl.formatMessage(
        {
          defaultMessage: '{hours}h {minutes}m',
          id: '3a26f598bc09',
          description: 'This is a time duration in abbreviated format',
        },
        {
          hours,
          minutes: minutesCarry,
        }
      );
    }
    return intl.formatMessage(
      {
        defaultMessage: '{hours} hours {minutes} minutes',
        id: '977e95e7a3ed',
        description: 'This is a time duration in full non abbreviated format',
      },
      {
        hours,
        minutes: minutesCarry,
      }
    );
  }

  const days = Math.floor(Math.abs(milliseconds / 24 / 60 / 60 / 1000));
  const hoursCarry = Math.round(Math.abs(milliseconds - days * 86400000) / 60 / 60 / 1000);
  if (abbreviated) {
    return intl.formatMessage(
      {
        defaultMessage: '{days}d {hours}h',
        id: 'b48987cfff5e',
        description: 'This is a time duration in abbreviated format',
      },
      {
        hours: hoursCarry,
        days,
      }
    );
  }
  return intl.formatMessage(
    {
      defaultMessage: '{days} days {hours} hours',
      id: '5fc2638d38d9',
      description: 'This is a time duration in full non abbreviated format',
    },
    {
      hours: hoursCarry,
      days,
    }
  );
}

export function getStatusString(status: string | undefined, hasRetries: boolean): string {
  const intl = getIntl();
  switch (status) {
    case Constants.STATUS.ABORTED:
      return intl.formatMessage({
        defaultMessage: 'Aborted',
        id: 'c7b218060180',

        description: 'The status message to show in monitoring view.',
      });

    case Constants.STATUS.CANCELLED:
      return intl.formatMessage({
        defaultMessage: 'Cancelled',
        id: '6984f2ed7e3f',

        description: 'The status message to show in monitoring view.',
      });
    case Constants.STATUS.FAILED:
      return intl.formatMessage({
        defaultMessage: 'Failed',
        id: '27ada7f449cf',
        description: 'The status message to show in monitoring view.',
      });
    case Constants.STATUS.FAULTED:
      return intl.formatMessage({
        defaultMessage: 'Faulted',
        id: 'f857177bd7ae',
        description: 'The status message to show in monitoring view.',
      });
    case Constants.STATUS.IGNORED:
      return intl.formatMessage({
        defaultMessage: 'Ignored',
        id: '2a78dc515741',
        description: 'The status message to show in monitoring view.',
      });

    case Constants.STATUS.SKIPPED:
      return intl.formatMessage({
        defaultMessage: 'Skipped',
        id: '9c721e5e9d8a',
        description: 'The status message to show in monitoring view.',
      });

    case Constants.STATUS.SUCCEEDED:
      return hasRetries
        ? intl.formatMessage({
            defaultMessage: 'Succeeded with retries',
            id: 'f8cedb0ba451',
            description:
              'The status message to show succeeeded retries in monitoring view.. This refers to the succeeded status of a previous action.',
          })
        : intl.formatMessage({
            defaultMessage: 'Succeeded',
            id: '59b206021d54',
            description: 'The status message to show succeeded in monitoring view.',
          });

    case Constants.STATUS.TIMEDOUT:
      return intl.formatMessage({
        defaultMessage: 'Timed out',
        id: '7a87c1f392d6',
        description: 'The status message to show timed out in monitoring view.',
      });

    case Constants.STATUS.WAITING:
      return intl.formatMessage({
        defaultMessage: 'Waiting',
        id: 'ed7e1403f672',
        description: 'The status message to show waiting in monitoring view.',
      });

    case Constants.STATUS.RUNNING:
      return intl.formatMessage({
        defaultMessage: 'Running',
        id: 'f5d774fe6dcd',
        description: 'The status message to show running in monitoring view.',
      });

    case Constants.STATUS.NOT_SPECIFIED:
    default:
      return intl.formatMessage({
        defaultMessage: 'Not specified',
        id: '2c194cf830f6',
        description: 'The status message to show not specified in monitoring view.',
      });
  }
}

export const filterRecord = <T>(data: Record<string, T>, filter: (_key: string, _val: any) => boolean): Record<string, T> => {
  const keyValuePropArray = Object.entries(data).filter(([key, value]) => filter(key, value));
  const output: Record<string, T> = {};
  keyValuePropArray.forEach(([key, value]) => (output[key] = value));
  return output;
};

export const getConnectorCategoryString = (connector: Connector | OperationApi | string): string => {
  const allStrings = getConnectorAllCategories();

  let connectorCategory: string;

  if (isBuiltInConnector(connector)) {
    connectorCategory = allStrings['inapp'];
  } else if (isCustomConnector(connector)) {
    connectorCategory = allStrings['custom'];
  } else if (isPremiumConnector(connector)) {
    connectorCategory = allStrings['premium'];
  } else {
    connectorCategory = allStrings['shared'];
  }

  return connectorCategory;
};

export const getConnectorAllCategories = (): Record<string, string> => {
  const intl = getIntl();
  const builtInText = intl.formatMessage({
    defaultMessage: 'In-app',
    id: '45ab7038189d',
    description: 'In-app category name text',
  });
  const azureText = intl.formatMessage({
    defaultMessage: 'Shared',
    id: '7a938c9d575f',
    description: 'Shared category name text',
  });
  const customText = intl.formatMessage({
    defaultMessage: 'Custom',
    id: '9d1a4cd36ae3',
    description: 'Custom category name text',
  });
  const premiumText = intl.formatMessage({
    defaultMessage: 'Premium',
    id: '72e29b2f0e2d',
    description: 'Premium category name text',
  });

  return { inapp: builtInText, shared: azureText, custom: customText, premium: premiumText };
};

export const getPreviewTag = (status: string | undefined): string | undefined => {
  const intl = getIntl();
  return equals(status, 'preview')
    ? intl.formatMessage({
        defaultMessage: 'Preview',
        id: '449dc3b849a8',
        description: 'The preview tag for a preview connector.',
      })
    : undefined;
};

export const removeAllNewlines = (inputStr: string): string => {
  return inputStr.replace(/\n/g, '').replace(/\r/g, '');
};

export const removeAllSpaces = (inputStr: string): string => {
  return inputStr.replace(/\s+/g, '');
};
