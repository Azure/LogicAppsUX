import { type LogicAppsV2, type BoundParameters, getIntl } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class IncrementVariableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.IncrementVariableInputs): BoundParameters {
    if (!inputs) {
      return {};
    }
    const intl = getIntl();
    const intlMessages = {
      [constants.INCREMENT_VARIABLE.NAME]: intl.formatMessage({
        defaultMessage: 'Name',
        id: '+fYwFL',
        description: 'Name',
      }),
      [constants.INCREMENT_VARIABLE.INCREMENT_BY]: intl.formatMessage({
        defaultMessage: 'Increment by',
        id: 'T7UzaS',
        description: 'Increment by',
      }),
    };

    const { name, value } = inputs;
    return {
      ...this.makeBoundParameter(constants.INCREMENT_VARIABLE.NAME, intlMessages[constants.INCREMENT_VARIABLE.NAME], name),
      ...this.makeOptionalBoundParameter(
        constants.INCREMENT_VARIABLE.INCREMENT_BY,
        intlMessages[constants.INCREMENT_VARIABLE.INCREMENT_BY],
        value
      ),
    };
  }
}
