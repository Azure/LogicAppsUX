import { ChatBubble } from './chatBubble';
import { ChatEntryReaction } from './conversationItem';
import { Link, mergeStyles } from '@fluentui/react';
import { useIntl } from 'react-intl';

type FeedbackMessageProps = {
  id: string;
  date: Date;
  reaction: ChatEntryReaction | undefined;
  askFeedback?: boolean;
  openFeedback?: () => void;
};

export const FeedbackMessage = ({ id, date, reaction, askFeedback, openFeedback }: FeedbackMessageProps) => {
  const intl = useIntl();
  const intlText = {
    feedbackCardPanelTitle: intl.formatMessage({
      defaultMessage: 'Send feedback',
      description: 'Chatbot feedback card title',
    }),
    feedbackCardThumbsDownLinkText: intl.formatMessage({
      defaultMessage: 'Tell Microsoft how this feature could be improved',
      description: 'Chatbot feedback card link asking how we can improve this feature',
    }),
    feedbackCardThumbsUpLinkText: intl.formatMessage({
      defaultMessage: 'Tell Microsoft what you liked about this feature',
      description: 'Chatbot feedback card link asking what user liked about the feature',
    }),
  };
  return askFeedback ? (
    <ChatBubble key={id} isUserMessage={false} isAIGenerated={false} date={date} className={mergeStyles({ marginTop: 8 })}>
      {reaction === ChatEntryReaction.thumbsUp && (
        <Link className="msla-feedbackmessage-link" onClick={openFeedback}>
          {intlText.feedbackCardThumbsUpLinkText}
        </Link>
      )}
      {reaction === ChatEntryReaction.thumbsDown && (
        <Link className="msla-feedbackmessage-link" onClick={openFeedback}>
          {intlText.feedbackCardThumbsDownLinkText}
        </Link>
      )}
    </ChatBubble>
  ) : null;
};
