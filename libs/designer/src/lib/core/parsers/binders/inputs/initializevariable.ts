import { Binder } from '../binder';
import type { BoundParameters } from '../types';
import constants from '../constants';
import { getIntl, type LogicAppsV2 } from '@microsoft/logic-apps-shared';

export default class InitializeVariableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.InitializeVariableInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.INITIALIZE_VARIABLE.NAME]: intl.formatMessage({
        defaultMessage: 'Name',
        id: '+fYwFL',
        description: 'Name',
      }),
      [constants.INITIALIZE_VARIABLE.TYPE]: intl.formatMessage({
        defaultMessage: 'Type',
        id: '7N3VsD',
        description: 'Type',
      }),
      [constants.INITIALIZE_VARIABLE.VALUE]: intl.formatMessage({
        defaultMessage: 'Value',
        id: 'ES5vsI',
        description: 'Value',
      }),
    };

    const { variables } = inputs;
    if (!variables) {
      return {};
    }

    const [variable] = variables;
    if (!variable) {
      return {};
    }

    const { name, type, value } = variable;
    return {
      ...this.makeBoundParameter(constants.INITIALIZE_VARIABLE.NAME, intlMessages[constants.INITIALIZE_VARIABLE.NAME], name),
      ...this.makeBoundParameter(constants.INITIALIZE_VARIABLE.TYPE, intlMessages[constants.INITIALIZE_VARIABLE.NAME], type),
      ...this.makeOptionalBoundParameter(constants.INITIALIZE_VARIABLE.VALUE, intlMessages[constants.INITIALIZE_VARIABLE.NAME], value),
    };
  }
}
