import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export interface IfInputs {
  expressionResult: boolean;
}

export default class IfInputsBinder extends Binder {
  bind(inputs: IfInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.IF.EXPRESSION_RESULT]: intl.formatMessage({
        defaultMessage: 'Expression result',
        id: 'uT8nCA',
        description: 'Expression result',
      }),
    };

    return {
      ...this.makeBoundParameter(constants.IF.EXPRESSION_RESULT, intlMessages[constants.IF.EXPRESSION_RESULT], inputs.expressionResult),
    };
  }
}
