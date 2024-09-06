import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class ParseJsonInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.ParseJsonActionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }
    const intl = getIntl();
    const intlMessages = {
      [constants.PARSE_JSON.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.PARSE_JSON.SCHEMA]: intl.formatMessage({
        defaultMessage: 'Schema',
        id: 'Q7FyUc',
        description: 'Schema',
      }),
    };

    const { content, schema } = inputs;
    return {
      ...this.makeBoundParameter(constants.PARSE_JSON.CONTENT, intlMessages[constants.PARSE_JSON.CONTENT], content),
      ...this.makeBoundParameter(constants.PARSE_JSON.SCHEMA, intlMessages[constants.PARSE_JSON.SCHEMA], schema),
    };
  }
}
