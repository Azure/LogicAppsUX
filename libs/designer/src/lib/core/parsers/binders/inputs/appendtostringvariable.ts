import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class AppendToStringVariableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.AppendToStringVariableInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.APPEND_TO_STRING_VARIABLE.NAME]: intl.formatMessage({
        defaultMessage: 'Name',
        id: '+fYwFL',
        description: 'Name',
      }),
      [constants.APPEND_TO_STRING_VARIABLE.VALUE]: intl.formatMessage({
        defaultMessage: 'Value',
        id: 'ES5vsI',
        description: 'Value',
      }),
    };

    const { name, value } = inputs;
    return {
      ...this.makeBoundParameter(constants.APPEND_TO_STRING_VARIABLE.NAME, intlMessages[constants.APPEND_TO_STRING_VARIABLE.NAME], name),
      ...this.makeBoundParameter(constants.APPEND_TO_STRING_VARIABLE.VALUE, intlMessages[constants.APPEND_TO_STRING_VARIABLE.VALUE], value),
    };
  }
}
