import { PromptGuideItemKey } from './promptGuideContextualMenu';
import { FontIcon } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface PromptGuideCardProps {
  itemKey: PromptGuideItemKey;
}

export const PromptGuideCard = ({ itemKey }: PromptGuideCardProps) => {
  let iconName: string | undefined;
  const intl = useIntl();
  const intlText = {
    addAction: intl.formatMessage({
      defaultMessage: 'Add an action',
      id: 'MGZRu4',
      description: 'Chatbot prompt to add action',
    }),
    addActionDescription: intl.formatMessage({
      defaultMessage:
        'Describe something your flow should do. Add details where possible, including the connector to use and if any content should be included.',
      id: 'jlcMGg',
      description: 'Chatbot prompt to add action description',
    }),
    replaceAction: intl.formatMessage({
      defaultMessage: 'Replace action',
      id: 'dMAC4C',
      description: 'Chatbot prompt to replace an action',
    }),
    replaceActionDescription: intl.formatMessage({
      defaultMessage:
        'Describe something in your flow that should be replaced, as well as what should replace it. Add details where possible, including the connector to use and if any content should be included.',
      id: 'WCASt1',
      description: 'Chatbot prompt to replace an action description',
    }),
    editFlow: intl.formatMessage({
      defaultMessage: 'Edit Flow',
      id: 'HfmDk9',
      description: 'Chatbot prompt to edit the workflow',
    }),
    editFlowDescription: intl.formatMessage({
      defaultMessage:
        'Describe how your flow should be changed. Add details where possible, including the connector to use and if any content should be included.',
      id: '8NUqpR',
      description: 'Chatbot prompt to edit the workflow description',
    }),
    question: intl.formatMessage({
      defaultMessage: 'Ask a question',
      id: 'BynK4X',
      description: 'Chatbot prompt to ask a question',
    }),
    questionDescription: intl.formatMessage({
      defaultMessage: 'Ask question related to your workflow or Logic Apps.',
      id: 'uxQ143',
      description: 'Chatbot prompt to ask a question description',
    }),
  };
  let cardResources: undefined | { title: string; description: string };

  switch (itemKey) {
    case PromptGuideItemKey.AddAction:
      iconName = 'Add';
      cardResources = { title: intlText.addAction, description: intlText.addActionDescription };
      break;
    case PromptGuideItemKey.ReplaceAction:
      iconName = 'Refresh';
      cardResources = { title: intlText.replaceAction, description: intlText.replaceActionDescription };
      break;
    case PromptGuideItemKey.EditFlow:
      iconName = 'Refresh';
      cardResources = { title: intlText.editFlow, description: intlText.editFlowDescription };
      break;
    case PromptGuideItemKey.Question:
      iconName = 'Unknown';
      cardResources = { title: intlText.question, description: intlText.questionDescription };
      break;
    // Other items don't have a card: they directly trigger a query or open a sub-menu
    default:
      break;
  }

  if (!cardResources) {
    return null;
  }

  return (
    <div className={'msla-prompt-guide-card-container'}>
      <div className={'msla-prompt-guide-card-header'}>
        {iconName && <FontIcon iconName={iconName} />}
        <div>{cardResources.title}</div>
      </div>
      <div className={'msla-prompt-guide-card-description'}>{cardResources.description}</div>
    </div>
  );
};
