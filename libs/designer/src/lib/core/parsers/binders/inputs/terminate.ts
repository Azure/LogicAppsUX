import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class TerminateInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.TerminateInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.TERMINATE.STATUS]: intl.formatMessage({
        defaultMessage: 'Status',
        id: 'w/rzfS',
        description: 'Status',
      }),
      [constants.TERMINATE.CODE]: intl.formatMessage({
        defaultMessage: 'Code',
        id: '42HafR',
        description: 'Code',
      }),
      [constants.TERMINATE.MESSAGE]: intl.formatMessage({
        defaultMessage: 'Message',
        id: '2H+HFm',
        description: 'Message',
      }),
    };

    let code: string | undefined;
    let message: string | undefined;
    const { runError, runStatus } = inputs;
    if (runError) {
      ({ code, message } = runError);
    }

    return {
      ...this.makeBoundParameter(constants.TERMINATE.STATUS, intlMessages[constants.TERMINATE.STATUS], runStatus),
      ...this.makeOptionalBoundParameter(constants.TERMINATE.CODE, intlMessages[constants.TERMINATE.CODE], code),
      ...this.makeOptionalBoundParameter(constants.TERMINATE.MESSAGE, intlMessages[constants.TERMINATE.MESSAGE], message),
    };
  }
}
