import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class SetVariableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.SetVariableInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.SET_VARIABLE.NAME]: intl.formatMessage({
        defaultMessage: 'Name',
        id: '+fYwFL',
        description: 'Name',
      }),
      [constants.SET_VARIABLE.VALUE]: intl.formatMessage({
        defaultMessage: 'Value',
        id: 'ES5vsI',
        description: 'Value',
      }),
    };

    const { name, value } = inputs;
    return {
      ...this.makeBoundParameter(constants.SET_VARIABLE.NAME, intlMessages[constants.SET_VARIABLE.NAME], name),
      ...this.makeBoundParameter(constants.SET_VARIABLE.VALUE, intlMessages[constants.SET_VARIABLE.VALUE], value),
    };
  }
}
