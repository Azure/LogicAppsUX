import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class DefaultInputsBinder extends Binder {
  bind(inputs: any): BoundParameters {
    if (inputs === undefined) {
      return {};
    }

    const intl = getIntl();

    const intlMessages = {
      [constants.DEFAULT.INPUTS]: intl.formatMessage({
        defaultMessage: 'Inputs',
        id: '226jzI',
        description: 'Inputs',
      }),
    };

    return this.makeBoundParameter(constants.DEFAULT.INPUTS, intlMessages[constants.DEFAULT.INPUTS], inputs);
  }
}
