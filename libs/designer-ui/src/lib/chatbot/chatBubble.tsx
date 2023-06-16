import { animations } from './animations';
import type { ChatResources } from './chatResources';
import { ThumbsReactionButton } from './thumbsReactionButton';
import { ActionButton, css, getTheme } from '@fluentui/react';
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
        'bubble-container',
        isUserMessage && USER_MESSAGE_CLASS,
        isUserMessage ? animations.userMessageEnter : animations.assistantMessageEnter,
        isEmphasized && animations.messageBorderGlint,
        className
      )}
    >
      <div className={css('bubble', isUserMessage && USER_MESSAGE_CLASS)}>{children}</div>
      {(footerActions || isAIGenerated) && (
        <div className={'bubble-footer'}>
          {footerActions && (
            <div className={'bubble-footer-actions'}>
              {footerActions.map((action) => (
                <div key={action.title} className={'bubble-actions-footer'}>
                  <ActionButton {...action} disabled={disabled || action.disabled} styles={footerButtonStyles} />
                </div>
              ))}
            </div>
          )}

          <div className={'bubble-footer'}>
            <div className={'bubble-disclaimer'}>{resources?.AIGeneratedDisclaimer}</div>
            {onThumbsReactionClicked && (
              <div className={'bubble-reactions'}>
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
