import { getIntl, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class TableInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.TableActionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.TABLE.FORMAT]: intl.formatMessage({
        defaultMessage: 'Format',
        id: 'i32aGO',
        description: 'Format',
      }),
      [constants.TABLE.FROM]: intl.formatMessage({
        defaultMessage: 'From',
        id: '8MMe7B',
        description: 'From',
      }),
      [constants.TABLE.COLUMNS]: intl.formatMessage({
        defaultMessage: 'Columns',
        id: 'BE11QS',
        description: 'Columns',
      }),
    };

    const { columns, format, from } = inputs;
    return {
      ...this.makeBoundParameter(constants.TABLE.FORMAT, intlMessages[constants.TABLE.FORMAT], format),
      ...this.makeBoundParameter(constants.TABLE.FROM, intlMessages[constants.TABLE.FROM], from),
      ...this.makeOptionalBoundParameter(constants.TABLE.COLUMNS, intlMessages[constants.TABLE.COLUMNS], columns),
    };
  }
}
