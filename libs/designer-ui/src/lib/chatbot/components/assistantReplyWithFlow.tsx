import { Confirm } from '../../dialogs/confirm';
import { useFeedbackMessage, useReportBugButton } from '../feedbackHelper';
import type { ChatBubbleAction } from './chatBubble';
import { ChatBubble } from './chatBubble';
import { UndoStatus, type AssistantReplyWithFlowItem } from './conversationItem';
import { ArrowUndoRegular, AddCircleRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';
import { makeStyles, tokens } from '@fluentui/react-components';
import { WorkflowChangeType, labelCase } from '@microsoft/logic-apps-shared';
import React from 'react';
import Markdown from 'react-markdown';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  changeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    margin: '4px 0',
  },
  changeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  changeFirstLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  changeSecondLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  changeTypeIcon: {
    flexShrink: 0,
    fontSize: '14px',
    padding: '6px',
  },
  addedIcon: {
    color: tokens.colorPaletteGreenForeground1,
  },
  modifiedIcon: {
    color: tokens.colorPaletteBlueForeground2,
  },
  removedIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  nodeIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '2px',
    flexShrink: 0,
    objectFit: 'contain',
  },
  nodeName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  nodeNameClickable: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    cursor: 'pointer',
    color: tokens.colorBrandForegroundLink,
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
  changeDescription: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground3,
  },
});

const changeIconMap = {
  [WorkflowChangeType.Added]: { icon: AddCircleRegular, styleKey: 'addedIcon' as const },
  [WorkflowChangeType.Modified]: { icon: EditRegular, styleKey: 'modifiedIcon' as const },
  [WorkflowChangeType.Removed]: { icon: DeleteRegular, styleKey: 'removedIcon' as const },
};

type AssistantReplyWithFlowProps = {
  item: AssistantReplyWithFlowItem;
};

export const AssistantReplyWithFlow: React.FC<AssistantReplyWithFlowProps> = ({ item }) => {
  const reportBugButton = useReportBugButton(false);
  const { feedbackMessage, onMessageReactionClicked, reaction } = useFeedbackMessage(item);
  const [isUndoConfirmationOpen, setIsUndoConfirmationOpen] = React.useState<boolean>(false);
  const intl = useIntl();
  const styles = useStyles();
  const intlText = {
    actionUndone: intl.formatMessage({
      defaultMessage: 'Action undone',
      id: 'JJyT88',
      description: 'Chatbot action was undone text',
    }),
    undo: intl.formatMessage({
      defaultMessage: 'Undo',
      id: 'hRVVdR',
      description: 'Chatbot undo button for undoing assistant change to flow',
    }),
    undoDialog: {
      title: intl.formatMessage({
        defaultMessage: 'Revert your flow',
        id: '9QNZSj',
        description: 'Chatbot undo operation confirmation title',
      }),
      learnMoreAriaLabel: intl.formatMessage({
        defaultMessage: 'Learn more about undo operations',
        id: 'BIzX3S',
        description: 'Aria label for undo operations in chatbot',
      }),
      primaryButtonActionText: intl.formatMessage({
        defaultMessage: 'Revert',
        id: 'eESljX',
        description: 'Chatbot undo operation confirm button text',
      }),
      secondaryButtonActionText: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: 'srMbm9',
        description: 'Chatbot undo operation cancel button text',
      }),
      warningMessage: intl.formatMessage({
        defaultMessage: `This will revert your workflow to the state it was in before Copilot's edit. If you made additional edits to the workflow after Copilot's, you will lose them. This action cannot be undone. Do you want to continue?`,
        id: '7gUE8h',
        description: 'Warning description of what undoing operation will do to the workflow',
      }),
    },
    defaultMessages: {
      flowUpdatedWithNoDiff: intl.formatMessage({
        defaultMessage: 'Your flow has been updated.',
        id: '4hi3ks',
        description: 'Chatbot workflow has been updated message',
      }),
    },
  };

  const onConfirmationClick = React.useCallback(() => {
    item.onClick?.(item.id);
    setIsUndoConfirmationOpen(false);
  }, [item]);

  const additionalFooterActions: ChatBubbleAction[] = [];
  if (item.undoStatus === UndoStatus.UndoAvailable) {
    additionalFooterActions.push({
      text: intlText.undo,
      onClick: () => setIsUndoConfirmationOpen(true),
      iconElement: React.createElement(ArrowUndoRegular),
      disabled: false, // TODO
    });
  } else if (item.undoStatus === UndoStatus.Undone) {
    additionalFooterActions.push({
      text: intlText.actionUndone,
      disabled: true,
    });
  }

  // TODO: add check for if isUsingDebugOptions
  additionalFooterActions.push(reportBugButton);

  return (
    <div>
      <ChatBubble
        key={item.id}
        isUserMessage={false}
        isAIGenerated={true}
        date={item.date}
        selectedReaction={reaction}
        onThumbsReactionClicked={(reaction) => onMessageReactionClicked(reaction)}
        additionalFooterActions={additionalFooterActions}
      >
        {item.changes && item.changes.length > 0 ? (
          <div className={styles.changeList}>
            {item.changes.map((change, index) => {
              const { icon: ChangeTypeIcon, styleKey } = changeIconMap[change.changeType] ?? changeIconMap[WorkflowChangeType.Modified];
              const isClickable = change.changeType !== WorkflowChangeType.Removed && !!item.onNodeClick;
              return (
                <div key={index} className={styles.changeItem}>
                  <div className={styles.changeFirstLine}>
                    {change.iconUri ? <img src={change.iconUri} alt="" className={styles.nodeIcon} /> : null}
                    <div>
                      {change.nodeIds.length > 0
                        ? change.nodeIds.map((id, i) => {
                            const label = labelCase(id) + (i < change.nodeIds.length - 1 ? ', ' : '');
                            return isClickable ? (
                              <span
                                key={id}
                                className={styles.nodeNameClickable}
                                role="button"
                                tabIndex={0}
                                onClick={() => item.onNodeClick?.(id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    item.onNodeClick?.(id);
                                  }
                                }}
                              >
                                {label}
                              </span>
                            ) : (
                              <span key={id} className={styles.nodeName}>
                                {label}
                              </span>
                            );
                          })
                        : null}
                    </div>
                  </div>
                  <div className={styles.changeSecondLine}>
                    <ChangeTypeIcon className={`${styles.changeTypeIcon} ${styles[styleKey]}`} />
                    <span className={styles.changeDescription}>{change.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Markdown>{item.text}</Markdown>
        )}
        <Confirm
          hidden={!isUndoConfirmationOpen}
          title={intlText.undoDialog.title}
          message={intlText.undoDialog.warningMessage}
          onConfirm={onConfirmationClick}
          onDismiss={() => setIsUndoConfirmationOpen(false)}
        />
      </ChatBubble>
      {feedbackMessage}
    </div>
  );
};
