import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Comment24Filled, Comment24Regular, CommentOff24Filled, CommentOff24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const CommentIcon = bundleIcon(Comment24Filled, Comment24Regular);
const CommentDeleteIcon = bundleIcon(CommentOff24Filled, CommentOff24Regular);

export interface CommentMenuItemProps {
  onClick: React.MouseEventHandler<HTMLDivElement>;
  hasComment: boolean;
}

export const CommentMenuItem = (props: CommentMenuItemProps) => {
  const { onClick, hasComment } = props;

  const intl = useIntl();
  const readOnly = useReadOnly();

  const commentDescription = intl.formatMessage({
    defaultMessage: 'Note',
    id: 'ms4ece4fceb47f',
    description: 'Note text',
  });
  const commentAdd = intl.formatMessage({
    defaultMessage: 'Add a note',
    id: 'msa275d4bb409d',
    description: 'Text to tell users to click to add comments',
  });
  const commentDelete = intl.formatMessage({
    defaultMessage: 'Delete note',
    id: 'msc7c913017229',
    description: 'Text to tell users to click to delete comments',
  });

  return (
    <MenuItem
      key={commentDescription}
      disabled={readOnly}
      icon={hasComment ? <CommentDeleteIcon /> : <CommentIcon />}
      title={hasComment ? commentDelete : commentAdd}
      onClick={onClick}
    >
      {hasComment ? commentDelete : commentAdd}
    </MenuItem>
  );
};
