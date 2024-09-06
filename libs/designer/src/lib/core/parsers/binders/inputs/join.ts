import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class JoinInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.JoinActionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.JOIN.FROM]: intl.formatMessage({
        defaultMessage: 'From',
        id: '8MMe7B',
        description: 'From',
      }),
      [constants.JOIN.JOIN_WITH]: intl.formatMessage({
        defaultMessage: 'Join with',
        id: 'GJZ5cw',
        description: 'Join with',
      }),
    };

    const { from, joinWith } = inputs;
    return {
      ...this.makeBoundParameter(constants.JOIN.FROM, intlMessages[constants.JOIN.FROM], from),
      ...this.makeBoundParameter(constants.JOIN.JOIN_WITH, intlMessages[constants.JOIN.JOIN_WITH], joinWith),
    };
  }
}
