import type { BoundParameters, ContentAndSchemaInputs } from '@microsoft/logic-apps-shared';
import { getIntl } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class XmlValidationInputsBinder extends Binder {
  bind(inputs: ContentAndSchemaInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const {
      content,
      integrationAccount: {
        schema: { name },
      },
    } = inputs;

    const intl = getIntl();
    const intlMessages = {
      [constants.XML_VALIDATION.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.XML_VALIDATION.SCHEMA_NAME]: intl.formatMessage({
        defaultMessage: 'Schema name',
        id: 'HwLu2v',
        description: 'Schema name',
      }),
    };

    return {
      ...this.makeBoundParameter(
        constants.XML_VALIDATION.CONTENT,
        intlMessages[constants.XML_VALIDATION.CONTENT],
        content,
        /* visibility */ '',
        {
          format: constants.FORMAT.XML,
        }
      ),
      ...this.makeBoundParameter(constants.XML_VALIDATION.SCHEMA_NAME, intlMessages[constants.XML_VALIDATION.SCHEMA_NAME], name),
    };
  }
}
