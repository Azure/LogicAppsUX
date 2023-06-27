import { getTheme, IconButton } from '@fluentui/react';
import React from 'react';

export interface IThumbsReactionButtonProps {
  isDownvote: boolean;
  resources?: {
    Upvote: string;
    Downvote: string;
  };
  isVoted: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const ThumbsReactionButton: React.FC<IThumbsReactionButtonProps> = ({ isVoted, resources, onClick, isDownvote, disabled }) => {
  const iconProps = isDownvote ? { iconName: isVoted ? 'DislikeSolid' : 'Dislike' } : { iconName: isVoted ? 'LikeSolid' : 'Like' };

  return (
    <IconButton
      title={isDownvote ? resources?.Downvote : resources?.Upvote}
      iconProps={iconProps}
      styles={getIconButtonStyles(isVoted)}
      onClick={onClick}
      disabled={disabled}
      toggle={true}
      checked={isVoted}
    />
  );
};

const getIconButtonStyles = (isVoted?: boolean) => {
  const theme = getTheme();
  return {
    root: { color: theme.palette.neutralPrimary, backgroundColor: 'transparent' },
    rootChecked: { color: theme.palette.themePrimary, backgroundColor: 'transparent' },
    icon: { color: isVoted ? theme.palette.themePrimary : 'unset' },
    rootDisabled: { color: theme.palette.neutralLighter, backgroundColor: 'transparent' },
  };
};
