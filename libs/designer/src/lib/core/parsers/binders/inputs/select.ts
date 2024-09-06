import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export interface SelectInputs {
  /* tslint:disable: no-any */
  from: any[];
  /* tslint:enable: no-any */
}

export default class SelectInputsBinder extends Binder {
  bind(inputs: SelectInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.SELECT.FROM]: intl.formatMessage({
        defaultMessage: 'From',
        id: '8MMe7B',
        description: 'From',
      }),
    };

    return this.makeBoundParameter(constants.SELECT.FROM, intlMessages[constants.SELECT.FROM], inputs.from);
  }
}
