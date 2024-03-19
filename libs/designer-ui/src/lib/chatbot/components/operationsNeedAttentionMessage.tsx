import { ChatBubble } from './chatBubble';
import type { OperationsNeedingAttentionItem } from './conversationItem';
import { OperationsNeedingAttentionOnUserAction } from './conversationItem';
import type { OperationInfoItemProps } from './flowDiffPreview';
import { OperationItemsList } from './flowDiffPreview';
import type { IFontIconProps } from '@fluentui/react';
import { FontIcon, getTheme } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

type OperationsNeedingAttentionMessageProps = {
  item: OperationsNeedingAttentionItem;
};

export const OperationsNeedingAttentionMessage: React.FC<OperationsNeedingAttentionMessageProps> = ({ item }) => {
  const intl = useIntl();
  const intlText = {
    allRequiredParametersAreSetMessage: intl.formatMessage({
      defaultMessage: 'All required parameters are set',
      id: 'YCDF7A',
      description: 'Chatbot message letting user know that required parameters are set.',
    }),
    savingDescription: intl.formatMessage({
      defaultMessage: 'To save this workflow, finish setting up this action:',
      id: 'zb3lE6',
      description: 'Chatbot message telling user to set up action in order to save the workflow',
    }),
    editingDescription: intl.formatMessage({
      defaultMessage: 'To get this workflow ready, finish setting up this action:',
      id: 'vmlhVB',
      description: 'Chatbot message telling user to set up action in order to get the workflow ready',
    }),
    savingDescription_plural: intl.formatMessage({
      defaultMessage: 'To save this workflow, finish setting up these actions:',
      id: 'sBBLuh',
      description: 'Chatbot message telling user to set up actions in order to save the workflow',
    }),
    editingDescription_plural: intl.formatMessage({
      defaultMessage: 'To get this workflow ready, finish setting up these actions:',
      id: '6pISgk',
      description: 'Chatbot message telling user to set up actions in order to get the workflow ready',
    }),
  };

  if (item.operationsNeedingAttention.length === 0) {
    return <AllOperationsFixedStatus message={intlText.allRequiredParametersAreSetMessage} />;
  }

  const description =
    item.userAction === OperationsNeedingAttentionOnUserAction.saving
      ? item.operationsNeedingAttention.length > 1
        ? intlText.savingDescription_plural
        : intlText.savingDescription
      : item.operationsNeedingAttention.length > 1
      ? intlText.editingDescription_plural
      : intlText.editingDescription;

  const operations = item.operationsNeedingAttention.map((info: any) => {
    const disabled = false;
    const isComplete = true;
    const statusIcon = disabled ? disabledIconProps : isComplete ? noAttentionIconProps : needAttentionIconProps;
    const operationProps: OperationInfoItemProps & { isComplete: boolean } = {
      info,
      isComplete,
      disabled,
      statusIcon, // TODO: add onClick selectOperationInDesigner(info.operationName)
    };
    return operationProps;
  });

  // TODO: add check for operations that are either disabled or complete

  return (
    <div>
      <ChatBubble key={item.id} isUserMessage={false} isAIGenerated={true} date={item.date} selectedReaction={item.reaction}>
        <div className={'msla-operationsneedattention-description'}>{description}</div>
        <OperationItemsList operations={operations} className={'msla-operationsneedattention-list'} />
      </ChatBubble>
    </div>
  );
};

const AllOperationsFixedStatus: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className={'msla-operationsfixedstatus-root'}>
      <span className={'msla-operationsfixedstatus-status'}>
        <FontIcon iconName="Completed" className={'msla-operationsfixedstatus-icon'} />
        <span className={'msla-operationsfixedstatus-text'}>{message}</span>
      </span>
    </div>
  );
};

const needAttentionIconProps: IFontIconProps = {
  iconName: 'Error',
  style: { color: getTheme().semanticColors.errorIcon },
};

const noAttentionIconProps: IFontIconProps = {
  iconName: 'Connected',
  style: { color: getTheme().semanticColors.successIcon },
};

const disabledIconProps: IFontIconProps = {
  iconName: 'Connected',
  style: { color: getTheme().semanticColors.inputIconDisabled },
};
