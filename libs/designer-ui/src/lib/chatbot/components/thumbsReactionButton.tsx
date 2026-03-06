import type React from 'react';
import { useIntl } from 'react-intl';
import { Button, Tooltip } from '@fluentui/react-components';
import { ThumbLikeRegular, ThumbLikeFilled, ThumbDislikeRegular, ThumbDislikeFilled } from '@fluentui/react-icons';

export interface IThumbsReactionButtonProps {
  isDownvote: boolean;
  isVoted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const ThumbsReactionButton: React.FC<IThumbsReactionButtonProps> = ({ isVoted, onClick, isDownvote, disabled }) => {
  const intl = useIntl();
  const intlText = {
    upvote: intl.formatMessage({
      defaultMessage: 'Like',
      id: 'XR4Sd/',
      description: 'Chatbot user feedback like button title',
    }),
    downvote: intl.formatMessage({
      defaultMessage: 'Dislike',
      id: 'yk7L+4',
      description: 'Chatbot user feedback dislike button title',
    }),
  };

  const icon = isDownvote ? (
    isVoted ? (
      <ThumbDislikeFilled />
    ) : (
      <ThumbDislikeRegular />
    )
  ) : isVoted ? (
    <ThumbLikeFilled />
  ) : (
    <ThumbLikeRegular />
  );

  return (
    <Tooltip content={isDownvote ? intlText.downvote : intlText.upvote} relationship="label">
      <Button onClick={onClick} appearance={'subtle'} disabled={disabled} icon={icon} aria-pressed={isVoted} />
    </Tooltip>
  );
};
