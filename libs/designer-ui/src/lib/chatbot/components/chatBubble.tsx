import { animations } from './animations';
import { ThumbsReactionButton } from './thumbsReactionButton';
import { Button, Link, mergeClasses, Tooltip } from '@fluentui/react-components';
import { bundleIcon, CopyFilled, CopyRegular } from '@fluentui/react-icons';
import type React from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export const ChatEntryReaction = {
  thumbsUp: 'thumbsUp',
  thumbsDown: 'thumbsDown',
} as const;
export type ChatEntryReaction = (typeof ChatEntryReaction)[keyof typeof ChatEntryReaction];

export type ChatBubbleAction = {
  text?: string;
  onClick?: () => void;
  disabled?: boolean;
  iconName?: string;
  iconElement?: React.ReactElement;
};

const CopyIcon = bundleIcon(CopyFilled, CopyRegular);

type ChatBubbleProps = {
  isUserMessage?: boolean;
  children: any;
  date: Date;
  isAIGenerated?: boolean;
  hideFooter?: boolean;
  isEmphasized?: boolean;
  additionalLinksSection?: JSX.Element;
  additionalFooterActions?: ChatBubbleAction[];
  className?: string;
  selectedReaction?: ChatEntryReaction;
  onThumbsReactionClicked?: (reaction: ChatEntryReaction) => void;
  disabled?: boolean;
  textRef?: React.RefObject<HTMLDivElement>;
  role?: {
    text?: string;
    onClick?: () => void;
    agentName?: string;
  };
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  isUserMessage,
  children,
  isAIGenerated,
  role,
  additionalLinksSection,
  additionalFooterActions,
  hideFooter,
  className,
  selectedReaction,
  onThumbsReactionClicked,
  disabled,
  isEmphasized,
  textRef,
}) => {
  const copyDisabled = useMemo(() => {
    try {
      return !document.queryCommandSupported('Copy');
    } catch {
      return true;
    }
  }, []);
  const intl = useIntl();
  const intlText = {
    aIGeneratedDisclaimer: intl.formatMessage({
      defaultMessage: 'AI-generated content may be incorrect',
      id: 'SHXdzU',
      description: 'Chatbot disclaimer message on AI-generated content potentially being incorrect',
    }),
    copyText: intl.formatMessage({
      defaultMessage: 'Copy',
      id: 'N7zEUZ',
      description: 'Chatbot copy button title',
    }),
  };

  const handleCopy = () => {
    if (textRef?.current) {
      const range = document.createRange();
      range.selectNode(textRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand('Copy');
    }
  };

  return (
    <div
      className={mergeClasses(
        'msla-bubble-container',
        isUserMessage && USER_MESSAGE_CLASS,
        isUserMessage ? animations.userMessageEnter : animations.assistantMessageEnter,
        isEmphasized && animations.messageBorderGlint,
        className
      )}
    >
      <div className={mergeClasses('msla-bubble', isUserMessage && USER_MESSAGE_CLASS)}>{children}</div>
      {additionalLinksSection && additionalLinksSection}
      {(additionalFooterActions && additionalFooterActions.length > 0) || (isAIGenerated && !hideFooter) ? (
        <div className={'msla-bubble-footer'}>
          {additionalFooterActions && (
            <div className={'msla-bubble-footer-actions'}>
              {additionalFooterActions.map((action, i) => (
                <Button key={i} size="small" icon={action.iconElement} disabled={disabled || action.disabled} onClick={action.onClick}>
                  {action.text}
                </Button>
              ))}
            </div>
          )}
          <div className={'msla-chat-bubble-footer'}>
            <div className={'msla-bubble-footer-disclaimer'}>{intlText.aIGeneratedDisclaimer}</div>
            <div className={'msla-bubble-reactions'}>
              {textRef && (
                <Tooltip content={intlText.copyText} relationship="label">
                  <Button appearance="subtle" icon={<CopyIcon />} onClick={handleCopy} disabled={copyDisabled} />
                </Tooltip>
              )}
              {onThumbsReactionClicked && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {role && (
        <div className="msla-bubble-footer-role">
          {role?.text && (
            <>
              {role.text}
              {' - '}
            </>
          )}
          <Link className="msla-bubble-footer-role--button" onClick={role?.onClick}>
            {role?.agentName}
          </Link>
        </div>
      )}
    </div>
  );
};

const USER_MESSAGE_CLASS = 'is-user-message';
