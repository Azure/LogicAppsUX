import { type LogicApps, getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ResponseInputsBinder extends Binder {
  bind(inputs: LogicApps.ResponseInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.RESPONSE.STATUS_CODE]: intl.formatMessage({
        defaultMessage: 'Status code',
        id: 'nwL6Mu',
        description: 'Status code',
      }),
      [constants.RESPONSE.HEADERS]: intl.formatMessage({
        defaultMessage: 'Headers',
        id: 'VchR9d',
        description: 'Headers',
      }),
      [constants.RESPONSE.BODY]: intl.formatMessage({
        defaultMessage: 'Body',
        id: '4SIrVn',
        description: 'Body',
      }),
      [constants.RESPONSE.SCHEMA]: intl.formatMessage({
        defaultMessage: 'Schema',
        id: 'Q7FyUc',
        description: 'Schema',
      }),
    };

    const { statusCode, body, headers, schema } = inputs;

    return {
      ...this.makeOptionalBoundParameter(constants.RESPONSE.STATUS_CODE, intlMessages[constants.RESPONSE.STATUS_CODE], statusCode),
      ...this.makeOptionalBoundParameter(constants.RESPONSE.HEADERS, intlMessages[constants.RESPONSE.HEADERS], headers),
      ...this.makeOptionalBoundParameter(constants.RESPONSE.BODY, intlMessages[constants.RESPONSE.BODY], body),
      ...this.makeOptionalBoundParameter(constants.RESPONSE.SCHEMA, intlMessages[constants.RESPONSE.SCHEMA], schema),
    };
  }
}
