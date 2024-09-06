import { Binder } from '../binder';
import type { BoundParameters } from '../types';
import constants from '../constants';
import { getIntl, type LogicApps } from '@microsoft/logic-apps-shared';

export default class WaitInputsBinder extends Binder {
  bind(inputs: LogicApps.WaitInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.WAIT.COUNT]: intl.formatMessage({
        defaultMessage: 'Count',
        id: 'EFfmBQ',
        description: 'Count',
      }),
      [constants.WAIT.UNIT]: intl.formatMessage({
        defaultMessage: 'Unit',
        id: 'o3N6hD',
        description: 'Unit',
      }),
      [constants.WAIT.TIMESTAMP]: intl.formatMessage({
        defaultMessage: 'Timestamp',
        id: '1CVcYG',
        description: 'Timestamp',
      }),
    };

    const { interval, until } = inputs;

    if (interval) {
      const { count, unit } = interval;

      return {
        ...this.makeBoundParameter(constants.WAIT.COUNT, intlMessages[constants.WAIT.COUNT], count),
        ...this.makeBoundParameter(constants.WAIT.UNIT, intlMessages[constants.WAIT.UNIT], unit),
      };
    }
    if (until) {
      const { timestamp } = until;

      return this.makeBoundParameter(constants.WAIT.TIMESTAMP, intlMessages[constants.WAIT.TIMESTAMP], timestamp);
    }
    return {};
  }
}
