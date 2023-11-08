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

export function useAzureCopilotButton(azureButtonCallback?: () => void): IButtonProps {
  const intl = useIntl();
  const intlText = {
    azureCopilotButtonText: intl.formatMessage({
      defaultMessage: 'Open Azure Copilot',
      description: 'Text for button that allows user to open azure copilot',
    }),
  };
  return {
    text: intlText.azureCopilotButtonText,
    onClick: azureButtonCallback,
    iconProps: {
      iconName: 'AzureLogo',
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
} {
  const { id, date, reaction: itemReaction, openFeedback, logFeedbackVote } = item;
  const [reaction, setReaction] = useState(itemReaction);
  const [askFeedback, setAskFeedback] = useState(false);

  const onMessageReactionClicked = (chatReaction: ChatEntryReaction) => {
    if (reaction) {
      logFeedbackVote?.(chatReaction, /*isRemovedVote*/ true);
    }
    if (reaction === chatReaction) {
      setReaction(undefined);
      setAskFeedback(false);
    } else {
      logFeedbackVote?.(chatReaction);
      setReaction(chatReaction);
      setAskFeedback(true);
    }
  };

  const feedbackMessage = useMemo(() => {
    return (
      <div>
        <FeedbackMessage id={id} date={date} reaction={reaction} askFeedback={askFeedback} openFeedback={openFeedback} />
      </div>
    );
  }, [askFeedback, date, id, openFeedback, reaction]);

  return {
    feedbackMessage,
    reaction,
    onMessageReactionClicked,
  };
}

const onReportBugClick = () => {
  const githubIssuesLink = 'https://github.com/Azure/LogicAppsUX/issues/new?assignees=&labels=&projects=&template=bug_report.yml';
  window.open(githubIssuesLink, '_blank');
};
