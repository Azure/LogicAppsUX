import { Button, Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

interface RemoveItemButtonProps {
  disabled: boolean;
  itemKey: number;
  visible: boolean;
  onClick(itemKey: number): void;
}

export const RemoveItemButton = ({ disabled, itemKey, visible, onClick }: RemoveItemButtonProps): JSX.Element | null => {
  const intl = useIntl();
  if (!visible) {
    return null;
  }

  const removeItemTooltip = intl.formatMessage(
    {
      defaultMessage: `Remove parameter ''{itemKey}'' and its value`,
      id: 'zWpl5p',
      description:
        'Tooltip for button to remove array item. Do not remove the double single quotes around the display name, as it is needed to wrap the placeholder text.',
    },
    { itemKey: (itemKey + 1).toString() }
  );

  return (
    <Tooltip relationship="label" content={removeItemTooltip}>
      <Button
        appearance="subtle"
        disabled={disabled}
        onClick={() => onClick(itemKey)}
        icon={<DeleteIcon />}
        style={{ color: 'var(--colorBrandForeground1)', height: '32px' }}
      />
    </Tooltip>
  );
};
