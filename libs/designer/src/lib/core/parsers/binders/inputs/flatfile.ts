import { getIntl, type FlatFileEncodingInputs, type BoundParameters } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class FlatFileInputsBinder extends Binder {
  bind(inputs: FlatFileEncodingInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const {
      content,
      emptyNodeGenerationMode,
      integrationAccount: {
        schema: { name },
      },
    } = inputs;

    const intl = getIntl();
    const intlMessages = {
      [constants.FLAT_FILE.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.FLAT_FILE.SCHEMA_NAME]: intl.formatMessage({
        defaultMessage: 'Schema name',
        id: 'HwLu2v',
        description: 'Schema name',
      }),
      [constants.FLAT_FILE.EMPTY_NODE_GENERATION_MODE]: intl.formatMessage({
        defaultMessage: 'Mode of empty node generation',
        id: 'MyI3OJ',
        description: 'Mode of empty node generation',
      }),
    };

    return {
      ...this.makeBoundParameter(constants.FLAT_FILE.CONTENT, intlMessages[constants.FLAT_FILE.CONTENT], content),
      ...this.makeBoundParameter(constants.FLAT_FILE.SCHEMA_NAME, intlMessages[constants.FLAT_FILE.SCHEMA_NAME], name),
      ...this.makeOptionalBoundParameter(
        constants.FLAT_FILE.EMPTY_NODE_GENERATION_MODE,
        intlMessages[constants.FLAT_FILE.EMPTY_NODE_GENERATION_MODE],
        emptyNodeGenerationMode
      ),
    };
  }
}
