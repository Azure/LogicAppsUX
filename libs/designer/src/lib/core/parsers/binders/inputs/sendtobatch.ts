import { getIntl, Visibility, type BoundParameters, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Binder } from '../binder';
import constants from '../constants';

export default class SendToBatchInputsBinder extends Binder {
  bind(inputs: LogicAppsV2.SendToBatchActionInputs): BoundParameters {
    if (!inputs) {
      return {};
    }

    const intl = getIntl();
    const intlMessages = {
      [constants.SEND_TO_BATCH.TRIGGER_NAME]: intl.formatMessage({
        defaultMessage: 'Trigger name',
        id: '+gC73N',
        description: 'Trigger name',
      }),
      [constants.SEND_TO_BATCH.BATCH_NAME]: intl.formatMessage({
        defaultMessage: 'Batch name',
        id: 'AidAXb',
        description: 'Batch name',
      }),
      [constants.SEND_TO_BATCH.PARTITION_NAME]: intl.formatMessage({
        defaultMessage: 'Partition name',
        id: 'SvuiB1',
        description: 'Partition name',
      }),
      [constants.SEND_TO_BATCH.MESSAGE_ID]: intl.formatMessage({
        defaultMessage: 'Message ID',
        id: 'STVtH6',
        description: 'Message ID',
      }),
      [constants.SEND_TO_BATCH.CONTENT]: intl.formatMessage({
        defaultMessage: 'Content',
        id: 'zcCswq',
        description: 'Content',
      }),
      [constants.SEND_TO_BATCH.WORKFLOW]: intl.formatMessage({
        defaultMessage: 'Workflow',
        id: '96OeHh',
        description: 'Workflow',
      }),
    };

    const {
      batchName,
      content,
      host: {
        triggerName,
        workflow: { id },
      },
      messageId,
      partitionName,
    } = inputs;
    return {
      ...this.makeBoundParameter(constants.SEND_TO_BATCH.TRIGGER_NAME, intlMessages[constants.SEND_TO_BATCH.TRIGGER_NAME], triggerName),
      ...this.makeBoundParameter(constants.SEND_TO_BATCH.BATCH_NAME, intlMessages[constants.SEND_TO_BATCH.BATCH_NAME], batchName),
      ...this.makeOptionalBoundParameter(
        constants.SEND_TO_BATCH.PARTITION_NAME,
        intlMessages[constants.SEND_TO_BATCH.PARTITION_NAME],
        partitionName
      ),
      ...this.makeOptionalBoundParameter(constants.SEND_TO_BATCH.MESSAGE_ID, intlMessages[constants.SEND_TO_BATCH.MESSAGE_ID], messageId),
      ...this.makeBoundParameter(constants.SEND_TO_BATCH.CONTENT, intlMessages[constants.SEND_TO_BATCH.CONTENT], content),
      ...this.makeBoundParameter(constants.SEND_TO_BATCH.WORKFLOW, intlMessages[constants.SEND_TO_BATCH.WORKFLOW], id, Visibility.Advanced),
    };
  }
}
