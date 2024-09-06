import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export interface SwitchInputs {
  expressionResult: number | string;
}

export default class SwitchInputsBinder extends Binder {
  bind(inputs: SwitchInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.SWITCH.EXPRESSION_RESULT]: intl.formatMessage({
        defaultMessage: 'Expression Result',
        id: '4zLU3V',
        description: 'Expression Result',
      }),
    };

    return {
      ...this.makeBoundParameter(
        constants.SWITCH.EXPRESSION_RESULT,
        intlMessages[constants.SWITCH.EXPRESSION_RESULT],
        inputs.expressionResult
      ),
    };
  }
}
