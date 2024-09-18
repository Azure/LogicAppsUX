import { getIntl, Visibility, type BoundParameters, type LogicApps } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class RecurrenceInputsBinder extends Binder {
  bind(recurrence: LogicApps.Recurrence): BoundParameters {
    if (!recurrence) {
      return {};
    }
    const intl = getIntl();

    const intlMessages = {
      [constants.RECURRENCE.FREQUENCY]: intl.formatMessage({
        defaultMessage: 'Frequency',
        id: '0n7in0',
        description: 'Frequency',
      }),
      [constants.RECURRENCE.INTERVAL]: intl.formatMessage({
        defaultMessage: 'Interval',
        id: 'Tc/uXH',
        description: 'Interval',
      }),
      [constants.RECURRENCE.COUNT]: intl.formatMessage({
        defaultMessage: 'Count',
        id: 'EFfmBQ',
        description: 'Count',
      }),
      [constants.RECURRENCE.START_TIME]: intl.formatMessage({
        defaultMessage: 'Start Time',
        id: 'udtp3p',
        description: 'Start Time',
      }),
      [constants.RECURRENCE.END_TIME]: intl.formatMessage({
        defaultMessage: 'End Time',
        id: 'DbRut+',
        description: 'End Time',
      }),
      [constants.RECURRENCE.TIME_ZONE]: intl.formatMessage({
        defaultMessage: 'Time Zone',
        id: '5/5RwF',
        description: 'Time Zone',
      }),
      [constants.RECURRENCE.SCHEDULE]: intl.formatMessage({
        defaultMessage: 'Schedule',
        id: 'WN+4vS',
        description: 'Schedule',
      }),
    };

    const { count, endTime, frequency, interval, schedule, startTime, timeZone } = recurrence;
    return {
      ...this.makeBoundParameter(constants.RECURRENCE.FREQUENCY, intlMessages[constants.RECURRENCE.FREQUENCY], frequency),
      ...this.makeBoundParameter(constants.RECURRENCE.INTERVAL, intlMessages[constants.RECURRENCE.INTERVAL], interval),
      ...this.makeOptionalBoundParameter(constants.RECURRENCE.COUNT, intlMessages[constants.RECURRENCE.COUNT], count, Visibility.Advanced),
      ...this.makeOptionalBoundParameter(
        constants.RECURRENCE.START_TIME,
        intlMessages[constants.RECURRENCE.START_TIME],
        startTime,
        Visibility.Advanced,
        {
          format: constants.FORMAT.DATE_TIME,
        }
      ),
      ...this.makeOptionalBoundParameter(
        constants.RECURRENCE.END_TIME,
        intlMessages[constants.RECURRENCE.END_TIME],
        endTime,
        Visibility.Advanced,
        {
          format: constants.FORMAT.DATE_TIME,
        }
      ),
      ...this.makeOptionalBoundParameter(
        constants.RECURRENCE.TIME_ZONE,
        intlMessages[constants.RECURRENCE.TIME_ZONE],
        timeZone,
        Visibility.Advanced
      ),
      ...this.makeOptionalBoundParameter(
        constants.RECURRENCE.SCHEDULE,
        intlMessages[constants.RECURRENCE.SCHEDULE],
        schedule,
        Visibility.Advanced
      ),
    };
  }
}
