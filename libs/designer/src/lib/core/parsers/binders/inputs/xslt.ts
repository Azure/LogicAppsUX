import { getIntl, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class XsltInputsBinder extends Binder {
  bind(inputs: any): BoundParameters {
    if (!inputs) {
      return {};
    }

    const {
      content,
      integrationAccount: {
        map: { name },
      },
    } = inputs;

    const intl = getIntl();
    const intlMessages = {
      [constants.XSLT.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.XSLT.MAP_NAME]: intl.formatMessage({
        defaultMessage: 'Map name',
        id: '27mYR/',
        description: 'Map name',
      }),
    };

    return {
      ...this.makeBoundParameter(constants.XSLT.CONTENT, intlMessages[constants.XSLT.CONTENT], content, /* visibility */ '', {
        format: constants.FORMAT.XML,
      }),
      ...this.makeBoundParameter(constants.XSLT.MAP_NAME, intlMessages[constants.XSLT.MAP_NAME], name),
    };
  }
}
