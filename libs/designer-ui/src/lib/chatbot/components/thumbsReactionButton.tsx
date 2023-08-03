import Constants from '../constants';
import Dislike from '../images/Dislike.svg';
import DislikeFilled from '../images/DislikeFilled.svg';
import Like from '../images/Like.svg';
import LikeFilled from '../images/LikeFilled.svg';
import { IconButton } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

export interface IThumbsReactionButtonProps {
  isDownvote: boolean;
  isVoted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const ThumbsReactionButton: React.FC<IThumbsReactionButtonProps> = ({ isVoted, onClick, isDownvote, disabled }) => {
  const icon = isDownvote ? (isVoted ? DislikeFilled : Dislike) : isVoted ? LikeFilled : Like;
  const intl = useIntl();
  const intlText = {
    upvote: intl.formatMessage({
      defaultMessage: 'Like',
      description: 'Chatbot user feedback like button title',
    }),
    downvote: intl.formatMessage({
      defaultMessage: 'Dislike',
      description: 'Chatbot user feedback dislike button title',
    }),
  };

  return (
    <IconButton
      title={isDownvote ? intlText.downvote : intlText.upvote}
      styles={getIconButtonStyles(isVoted)}
      onClick={onClick}
      disabled={disabled}
      toggle={true}
      checked={isVoted}
      iconProps={{
        imageProps: {
          src: icon,
          styles: getIconButtonStyles(isVoted),
        },
      }}
    />
  );
};

const getIconButtonStyles = (isVoted?: boolean) => {
  return {
    root: { color: Constants.NEUTRAL_PRIMARY, backgroundColor: 'transparent' },
    rootChecked: { color: Constants.THEME_PRIMARY, backgroundColor: 'transparent' },
    icon: { color: isVoted ? Constants.THEME_PRIMARY : 'unset' },
    rootDisabled: { color: Constants.NEUTRAL_LIGHTER, backgroundColor: 'transparent' },
  };
};
