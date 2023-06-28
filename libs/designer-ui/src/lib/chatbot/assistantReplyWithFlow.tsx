import { Confirm } from '../dialogs/confirm';
import { ChatBubble } from './chatBubble';
import { UndoStatus, type AssistantReplyWithFlowItem } from './conversationItem';
import { FeedbackMessage } from './feedbackMessage';
import { FlowDiffPreview } from './flowDiffPreview';
import React from 'react';
import { useIntl } from 'react-intl';

type AssistantReplyWithFlowProps = {
  item: AssistantReplyWithFlowItem;
};

export const AssistantReplyWithFlow: React.FC<AssistantReplyWithFlowProps> = ({ item }) => {
  const [isUndoConfirmationOpen, setIsUndoConfirmationOpen] = React.useState<boolean>(false);
  const intl = useIntl();
  const intlText = {
    actionUndone: intl.formatMessage({
      defaultMessage: 'Action undone',
      description: 'Chatbot action was undone text',
    }),
    reportABugText: intl.formatMessage({
      defaultMessage: 'Report a bug',
      description: 'Chatbot report a bug button',
    }),
    undo: intl.formatMessage({
      defaultMessage: 'Undo',
      description: 'Chatbot undo button for undoing assistant change to flow',
    }),
    undoDialog: {
      title: intl.formatMessage({
        defaultMessage: 'Revert your flow',
        description: 'Chatbot undo operation confirmation title',
      }),
      learnMoreAriaLabel: intl.formatMessage({
        defaultMessage: 'Learn more about undo operations',
        description: 'Aria label for undo operations in chatbot',
      }),
      primaryButtonActionText: intl.formatMessage({
        defaultMessage: 'Revert',
        description: 'Chatbot undo operation confirm button text',
      }),
      secondaryButtonActionText: intl.formatMessage({
        defaultMessage: 'Cancel',
        description: 'Chatbot undo operation cancel button text',
      }),
      warningMessage: intl.formatMessage({
        defaultMessage: `This will revert your workflow to the state it was in before Copilot's edit. If you made additional edits to the workflow after Copilot's, you will lose them. This action cannot be undone. Do you want to continue?`,
        description: 'Warning description of what undoing operation will do to the workflow',
      }),
    },
    defaultMessages: {
      flowUpdatedWithNoDiff: intl.formatMessage({
        defaultMessage: `Your flow has been updated.`,
        description: 'Chatbot workflow has been updated message',
      }),
    },
  };

  const onConfirmationClick = React.useCallback(() => {
    // TODO: undo whatever operation - onUndoOperationRequested(item);
    setIsUndoConfirmationOpen(false);
  }, []);

  const footerActions = [];
  if (item.undoStatus === UndoStatus.UndoAvailable) {
    footerActions.push({
      text: intlText.undo,
      onClick: () => setIsUndoConfirmationOpen(true),
      iconProps: { iconName: 'Undo' },
      disabled: false, // TODO
    });
  } else if (item.undoStatus === UndoStatus.Undone) {
    footerActions.push({
      text: intlText.actionUndone,
      disabled: true,
    });
  }

  // TODO: add check for if isUsingDebugOptions
  footerActions.push({
    text: intlText.reportABugText,
    //TODO: add onClick: () => onReportBugClick(item),
    iconProps: { iconName: 'Bug' },
    disabled: false, // TODO: add isBlockingOperationInProgress,
  });

  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={true}
        date={item.date}
        selectedReaction={item.reaction}
        onThumbsReactionClicked={(reaction) => reaction} // TODO: add onMessageReactionClicked(item, reaction)}
        footerActions={footerActions}
      >
        <FlowDiffPreview />
        <Confirm
          hidden={!isUndoConfirmationOpen}
          title={intlText.undoDialog.title}
          message={intlText.undoDialog.warningMessage}
          onConfirm={onConfirmationClick}
          onDismiss={() => setIsUndoConfirmationOpen(false)}
        />
      </ChatBubble>
      <FeedbackMessage item={item} />
    </div>
  );
};
