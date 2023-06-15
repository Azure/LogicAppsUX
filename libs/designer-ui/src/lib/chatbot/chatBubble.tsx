import { animations } from './animations';
import type { ChatResources } from './chatResources';
import { ThumbsReactionButton } from './thumbsReactionButton';
import { ActionButton, css, FontSizes, getTheme, mergeStyleSets } from '@fluentui/react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import React from 'react';

export enum ChatEntryReaction {
  thumbsUp = 'thumbsUp',
  thumbsDown = 'thumbsDown',
}

type ChatBubbleProps = {
  isUserMessage?: boolean;
  isMarkdownMessage?: boolean;
  children: any;
  date: Date;
  isAIGenerated?: boolean;
  isEmphasized?: boolean;
  footerActions?: IButtonProps[];
  className?: string;
  selectedReaction?: string; // TODO: store as something else potentially?
  onThumbsReactionClicked?: (reaction: string) => void;
  disabled?: boolean;
  resources?: ChatResources;
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  isUserMessage,
  children,
  isAIGenerated,
  footerActions,
  className,
  selectedReaction,
  onThumbsReactionClicked,
  disabled,
  resources,
  isEmphasized,
}) => {
  return (
    <div
      className={css(
        styles.bubbleContainer,
        isUserMessage && USER_MESSAGE_CLASS,
        isUserMessage ? animations.userMessageEnter : animations.assistantMessageEnter,
        isEmphasized && animations.messageBorderGlint,
        className
      )}
    >
      <div className={css(styles.bubble, isUserMessage && USER_MESSAGE_CLASS)}>{children}</div>
      {(footerActions || isAIGenerated) && (
        <div className={styles.bubbleFooter}>
          {footerActions && (
            <div className={styles.footerActions}>
              {footerActions.map((action) => (
                <div key={action.title} className={styles.actionsFooter}>
                  <ActionButton {...action} disabled={disabled || action.disabled} styles={footerButtonStyles} />
                </div>
              ))}
            </div>
          )}

          <div className={styles.footer}>
            <div className={styles.disclaimer}>{resources?.AIGeneratedDisclaimer}</div>
            {onThumbsReactionClicked && (
              <div className={styles.reactions}>
                <>
                  <ThumbsReactionButton
                    resources={resources?.ThumbReaction}
                    onClick={() => onThumbsReactionClicked(ChatEntryReaction.thumbsUp)}
                    isVoted={selectedReaction === ChatEntryReaction.thumbsUp}
                    isDownvote={false}
                    disabled={disabled}
                  />
                  <ThumbsReactionButton
                    resources={resources?.ThumbReaction}
                    onClick={() => onThumbsReactionClicked(ChatEntryReaction.thumbsDown)}
                    isVoted={selectedReaction === ChatEntryReaction.thumbsDown}
                    isDownvote={true}
                    disabled={disabled}
                  />
                </>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const USER_MESSAGE_CLASS = 'is-user-message';

const footerButtonStyles: IButtonStyles = {
  root: {
    color: getTheme().palette.neutralPrimary,
    alignItems: 'center',
    border: `1px solid ${getTheme().palette.neutralTertiary}`,
    borderRadius: 4,
    padding: '2px 8px',
    lineHeight: 16,
    height: '28px',
  },
  rootDisabled: {
    backgroundColor: getTheme().palette.neutralLighter,
    color: '#BDBDBD',
  },
  rootHovered: {
    backgroundColor: getTheme().palette.neutralLighter,
    color: getTheme().palette.neutralPrimaryAlt,
  },
  rootPressed: {
    backgroundColor: getTheme().palette.neutralLighter,
    color: getTheme().palette.neutralPrimary,
  },
  icon: {
    color: getTheme().palette.neutralPrimary,
  },
  iconHovered: {
    color: getTheme().palette.neutralPrimaryAlt,
  },
  iconPressed: {
    color: getTheme().palette.neutralPrimary,
  },
};

const styles = mergeStyleSets({
  bubbleContainer: {
    alignSelf: 'auto',
    marginRight: 0,
    marginLeft: 0,
    padding: 12,
    borderRadius: 8,
    background: getTheme().palette.white,
    boxShadow: getTheme().effects.elevation4,
    [`&.${USER_MESSAGE_CLASS}`]: {
      boxShadow: 'none',
      alignSelf: 'flex-end',
      marginRight: 0,
      marginLeft: 60,
      background: getTheme().palette.themeLighter,
    },
  },
  bubble: {
    wordBreak: 'break-word',
    width: '100%',
    borderRadius: 10,
    textAlign: 'start',
  },
  bubbleFooter: {
    paddingTop: 12,
    gap: 4,
  },
  footerActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: 5,
  },
  disclaimer: {
    fontSize: FontSizes.xSmall,
    color: '#707070',
    height: 32,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
  },
  actionsFooter: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  reactions: {
    flexGrow: 2,
    textAlign: 'right',
  },
});
