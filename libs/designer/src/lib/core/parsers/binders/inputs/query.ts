import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export interface QueryInputs {
  /* tslint:disable: no-any */
  body: any[];
  /* tslint:enable: no-any */
}

/**
 * Unlike most operations, Query (aka Filter Array) run inputs records do not look like their definition inputs.
 *
 * Example definition:
 * {
 *   "inputs": {
 *     "from": "@triggerBody()"
 *   }
 * }
 *
 * Example run inputs record:
 * {
 *   "body": [1, 2, 3, 4, 5]
 * }
 */
export default class QueryInputsBinder extends Binder {
  bind(inputs: QueryInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.QUERY.FROM]: intl.formatMessage({
        defaultMessage: 'From',
        id: '8MMe7B',
        description: 'From',
      }),
    };

    return this.makeBoundParameter(constants.QUERY.FROM, intlMessages[constants.QUERY.FROM], inputs.body);
  }
}
