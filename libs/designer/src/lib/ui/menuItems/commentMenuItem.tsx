import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Comment24Filled, Comment24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const CommentIcon = bundleIcon(Comment24Filled, Comment24Regular);

export interface CommentMenuItemProps {
  onClick: (e: any) => void;
  hasComment: boolean;
}

export const CommentMenuItem = (props: CommentMenuItemProps) => {
  const { onClick, hasComment } = props;

  const intl = useIntl();
  const readOnly = useReadOnly();

  const commentDescription = intl.formatMessage({
    defaultMessage: 'Note',
    description: 'Note text',
  });
  const commentAdd = intl.formatMessage({
    defaultMessage: 'Add a note',
    description: 'Text to tell users to click to add comments',
  });
  const commentDelete = intl.formatMessage({
    defaultMessage: 'Delete note',
    description: 'Text to tell users to click to delete comments',
  });

  return (
    <MenuItem
      key={commentDescription}
      disabled={readOnly}
      icon={<CommentIcon />}
      title={hasComment ? commentDelete : commentAdd}
      onClick={onClick}
    >
      {hasComment ? commentDelete : commentAdd}
    </MenuItem>
  );
};
