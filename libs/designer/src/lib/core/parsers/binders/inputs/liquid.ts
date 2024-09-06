import { getIntl, type BoundParameters, type LiquidActionInputs } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class LiquidInputsBinder extends Binder {
  bind(inputs: LiquidActionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.LIQUID.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.LIQUID.MAP_NAME]: intl.formatMessage({
        defaultMessage: 'Map name',
        id: '27mYR/',
        description: 'Map name',
      }),
    };

    const {
      content,
      integrationAccount: {
        map: { name },
      },
    } = inputs;

    return {
      ...this.makeBoundParameter(constants.LIQUID.CONTENT, intlMessages[constants.LIQUID.CONTENT], content),
      ...this.makeBoundParameter(constants.LIQUID.MAP_NAME, intlMessages[constants.LIQUID.MAP_NAME], name),
    };
  }
}
