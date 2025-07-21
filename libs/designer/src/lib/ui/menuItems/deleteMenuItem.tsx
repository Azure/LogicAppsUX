import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { MenuItem, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { useIntl } from 'react-intl';
import { equals } from '@microsoft/logic-apps-shared';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

export interface DeleteMenuItemProps {
  onClick: (e: any) => void;
  showKey?: boolean;
  isTrigger?: boolean;
  operationType?: string;
}

export const DeleteMenuItem = (props: DeleteMenuItemProps) => {
  const { onClick, showKey = false, isTrigger, operationType } = props;
  const isA2AWorkflow = useIsA2AWorkflow();
  const disableDeleteTriggerForA2a = isA2AWorkflow && isTrigger && equals(operationType, 'Request');

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

  const a2aTriggerDisabledText = intl.formatMessage({
    defaultMessage: 'Cannot delete trigger in agent to agent workflows',
    id: '4Sa4em',
    description: 'Message shown when trigger deletion is disabled in A2A workflows',
  });

  const isDisabled = readOnly || disableDeleteTriggerForA2a;

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

  if (disableDeleteTriggerForA2a) {
    return (
      <Tooltip content={a2aTriggerDisabledText} relationship="description">
        {menuItem}
      </Tooltip>
    );
  }

  return menuItem;
};
