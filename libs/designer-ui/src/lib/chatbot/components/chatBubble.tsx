import { animations } from './animations';
import { ThumbsReactionButton } from './thumbsReactionButton';
import { ActionButton, css, getTheme } from '@fluentui/react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

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
  selectedReaction?: ChatEntryReaction;
  onThumbsReactionClicked?: (reaction: ChatEntryReaction) => void;
  disabled?: boolean;
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
  isEmphasized,
}) => {
  const intl = useIntl();
  const intlText = {
    aIGeneratedDisclaimer: intl.formatMessage({
      defaultMessage: 'AI-generated content may be incorrect',
      description: 'Chatbot disclaimer message on AI-generated content potentially being incorrect',
    }),
  };
  return (
    <div
      className={css(
        'msla-bubble-container',
        isUserMessage && USER_MESSAGE_CLASS,
        isUserMessage ? animations.userMessageEnter : animations.assistantMessageEnter,
        isEmphasized && animations.messageBorderGlint,
        className
      )}
    >
      <div className={css('msla-bubble', isUserMessage && USER_MESSAGE_CLASS)}>{children}</div>
      {(footerActions || isAIGenerated) && (
        <div className={'msla-bubble-footer'}>
          {footerActions && (
            <div className={'msla-bubble-footer-actions'}>
              {footerActions.map((action) => (
                <div key={action.title} className={'msla-bubble-actions-footer'}>
                  <ActionButton {...action} disabled={disabled || action.disabled} styles={footerButtonStyles} />
                </div>
              ))}
            </div>
          )}
          <div className={'msla-chat-bubble-footer'}>
            <div className={'msla-bubble-footer-disclaimer'}>{intlText.aIGeneratedDisclaimer}</div>
            {onThumbsReactionClicked && (
              <div className={'msla-bubble-reactions'}>
                <ThumbsReactionButton
                  onClick={() => onThumbsReactionClicked(ChatEntryReaction.thumbsUp)}
                  isVoted={selectedReaction === ChatEntryReaction.thumbsUp}
                  isDownvote={false}
                  disabled={disabled}
                />
                <ThumbsReactionButton
                  onClick={() => onThumbsReactionClicked(ChatEntryReaction.thumbsDown)}
                  isVoted={selectedReaction === ChatEntryReaction.thumbsDown}
                  isDownvote={true}
                  disabled={disabled}
                />
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
