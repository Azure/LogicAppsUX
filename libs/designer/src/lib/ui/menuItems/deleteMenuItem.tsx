import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

export interface DeleteMenuItemProps {
  onClick: (e: any) => void;
  showKey?: boolean;
}

export const DeleteMenuItem = (props: DeleteMenuItemProps) => {
  const { onClick, showKey = false } = props;

  const intl = useIntl();
  const readOnly = useReadOnly();

  const deleteText = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'Delete text',
  });
  // const disableTriggerDeleteText = intl.formatMessage({
  //   defaultMessage: 'Triggers cannot be deleted.',
  //   description: 'Text to explain that triggers cannot be deleted',
  // });
  const deleteKeyboardText = intl.formatMessage({
    defaultMessage: 'Del',
    description: '"Delete" keyboard command text',
  });

  return (
    <MenuItem
      key={deleteText}
      disabled={readOnly}
      icon={<DeleteIcon />}
      secondaryContent={showKey ? deleteKeyboardText : undefined}
      onClick={onClick}
    >
      {deleteText}
    </MenuItem>
  );
};
