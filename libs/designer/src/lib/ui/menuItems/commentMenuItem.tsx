import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import {
  bundleIcon,
  TextDescription24Filled,
  TextDescription24Regular,
  TextGrammarDismiss24Filled,
  TextGrammarDismiss24Regular,
} from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const DescriptionIcon = bundleIcon(TextDescription24Filled, TextDescription24Regular);
const DescriptionDeleteIcon = bundleIcon(TextGrammarDismiss24Filled, TextGrammarDismiss24Regular);
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
    id: 'Ts5Pzr',
    description: 'Note text',
  });
  const commentAdd = intl.formatMessage({
    defaultMessage: 'Add a description',
    id: 'ZyntX1',
    description: 'Text that tells you to select for adding a description',
  });
  const commentDelete = intl.formatMessage({
    defaultMessage: 'Delete description',
    id: 'inBzaB',
    description: 'Text that tells you to select description for deletion',
  });

  return (
    <MenuItem
      key={commentDescription}
      disabled={readOnly}
      icon={hasComment ? <DescriptionDeleteIcon /> : <DescriptionIcon />}
      title={hasComment ? commentDelete : commentAdd}
      onClick={onClick}
    >
      {hasComment ? commentDelete : commentAdd}
    </MenuItem>
  );
};
