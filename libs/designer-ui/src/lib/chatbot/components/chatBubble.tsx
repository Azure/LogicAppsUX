import constants from '../constants';
import { animations } from './animations';
import { ThumbsReactionButton } from './thumbsReactionButton';
import { ActionButton, css, useTheme } from '@fluentui/react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

export enum ChatEntryReaction {
  thumbsUp = 'thumbsUp',
  thumbsDown = 'thumbsDown',
}

type ChatBubbleProps = {
  isUserMessage?: boolean;
  children: any;
  date: Date;
  isAIGenerated?: boolean;
  hideFooter?: boolean;
  isEmphasized?: boolean;
  additionalFooterActions?: IButtonProps[];
  className?: string;
  selectedReaction?: ChatEntryReaction;
  onThumbsReactionClicked?: (reaction: ChatEntryReaction) => void;
  disabled?: boolean;
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  isUserMessage,
  children,
  isAIGenerated,
  additionalFooterActions,
  hideFooter,
  className,
  selectedReaction,
  onThumbsReactionClicked,
  disabled,
  isEmphasized,
}) => {
  const intl = useIntl();
  const { isInverted } = useTheme();
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
      {(additionalFooterActions && additionalFooterActions.length > 0) || (isAIGenerated && !hideFooter) ? (
        <div className={'msla-bubble-footer'}>
          {additionalFooterActions && (
            <div className={'msla-bubble-footer-actions'}>
              {additionalFooterActions.map((action, i) => (
                <div key={i} className={'msla-bubble-actions-footer'}>
                  <ActionButton {...action} disabled={disabled || action.disabled} styles={getFooterButtonStyles(isInverted)} />
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
      ) : null}
    </div>
  );
};

const USER_MESSAGE_CLASS = 'is-user-message';

const getFooterButtonStyles = (isInverted?: boolean): IButtonStyles => {
  return {
    root: {
      color: isInverted ? constants.DARK_PRIMARY : constants.NEUTRAL_PRIMARY,
      alignItems: 'center',
      border: `1px solid ${constants.NEUTRAL_TERTIARY}`,
      borderRadius: 4,
      padding: '2px 8px',
      lineHeight: 16,
      height: '28px',
    },
    rootDisabled: {
      backgroundColor: constants.NEUTRAL_LIGHTER,
      color: '#BDBDBD',
    },
    rootHovered: {
      backgroundColor: isInverted ? constants.NEUTRAL_PRIMARY : constants.NEUTRAL_LIGHTER,
      color: isInverted ? constants.DARK_PRIMARY : constants.NEUTRAL_PRIMARY_ALT,
    },
    rootPressed: {
      backgroundColor: constants.NEUTRAL_LIGHTER,
      color: constants.NEUTRAL_PRIMARY,
    },
    icon: {
      color: constants.NEUTRAL_PRIMARY,
    },
    iconHovered: {
      color: constants.NEUTRAL_PRIMARY_ALT,
    },
    iconPressed: {
      color: constants.NEUTRAL_PRIMARY,
    },
  };
};
