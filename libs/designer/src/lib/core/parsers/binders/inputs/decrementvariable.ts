import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class DecrementVariableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.DecrementVariableInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.DECREMENT_VARIABLE.NAME]: intl.formatMessage({
        defaultMessage: 'Name',
        id: '+fYwFL',
        description: 'Name',
      }),
      [constants.DECREMENT_VARIABLE.DECREMENT_BY]: intl.formatMessage({
        defaultMessage: 'Decrement by',
        id: 'UqerQO',
        description: 'Decrement by',
      }),
    };

    const { name, value } = inputs;
    return {
      ...this.makeBoundParameter(constants.DECREMENT_VARIABLE.NAME, intlMessages[constants.DECREMENT_VARIABLE.NAME], name),
      ...this.makeOptionalBoundParameter(
        constants.DECREMENT_VARIABLE.DECREMENT_BY,
        intlMessages[constants.DECREMENT_VARIABLE.DECREMENT_BY],
        value
      ),
    };
  }
}
