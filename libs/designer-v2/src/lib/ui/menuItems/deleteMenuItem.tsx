import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

export interface DeleteMenuItemProps {
  onClick: (e: any) => void;
  showKey?: boolean;
  isTrigger?: boolean;
  operationType?: string;
}

export const DeleteMenuItem = (props: DeleteMenuItemProps) => {
  const { onClick, showKey = false } = props;

  const intl = useIntl();
  const readOnly = useReadOnly();

  const deleteText = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'vSlNPe',
    description: 'Delete text',
  });

  const deleteKeyboardText = intl.formatMessage({
    defaultMessage: 'Del',
    id: '0CPsxh',
    description: '"Delete" keyboard command text',
  });

  const isDisabled = readOnly;

  const menuItem = (
    <MenuItem
      key={deleteText}
      disabled={isDisabled}
      icon={<DeleteIcon />}
      secondaryContent={showKey ? deleteKeyboardText : undefined}
      onClick={isDisabled ? undefined : onClick}
    >
      {deleteText}
    </MenuItem>
  );

  return menuItem;
};
