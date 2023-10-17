import type { ChatEntryReaction, ReactionItem } from './components/conversationItem';
import { FeedbackMessage } from './components/feedbackMessage';
import Constants from './constants';
import type { IButtonProps } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export function useReportBugButton(disabled: boolean): IButtonProps {
  const intl = useIntl();
  const intlText = {
    reportBugButtonText: intl.formatMessage({
      defaultMessage: 'Report a bug',
      description: 'Text for button that allows user to report a bug in the chatbot experience',
    }),
  };
  return {
    text: intlText.reportBugButtonText,
    onClick: () => onReportBugClick(),
    disabled,
    iconProps: {
      iconName: 'Bug',
      styles: {
        root: {
          color: Constants.NEUTRAL_PRIMARY,
          backgroundColor: 'transparent',
        },
      },
    },
  };
}

export function useFeedbackMessage(item: ReactionItem): {
  feedbackMessage: JSX.Element;
  onMessageReactionClicked: (chatEntryReaction: ChatEntryReaction) => void;
  reaction: ChatEntryReaction | undefined;
  askFeedback: boolean;
} {
  const [reaction, setReaction] = useState(item.reaction);
  const [askFeedback, setAskFeedback] = useState(item.askFeedback);

  const onMessageReactionClicked = (chatReaction: ChatEntryReaction) => {
    if (reaction === chatReaction) {
      setReaction(undefined);
      setAskFeedback(false);
    } else {
      setReaction(chatReaction);
      setAskFeedback(true);
    }
  };

  const feedbackMessage = useMemo(() => {
    return (
      <div>
        <FeedbackMessage id={item.id} date={item.date} reaction={reaction} askFeedback={askFeedback} />
      </div>
    );
  }, [askFeedback, item.date, item.id, reaction]);

  return {
    feedbackMessage,
    onMessageReactionClicked,
    reaction,
    askFeedback,
  };
}

const onReportBugClick = () => {
  const githubIssuesLink = 'https://github.com/Azure/LogicAppsUX/issues/new?assignees=&labels=&projects=&template=bug_report.yml';
  window.open(githubIssuesLink, '_blank');
};
