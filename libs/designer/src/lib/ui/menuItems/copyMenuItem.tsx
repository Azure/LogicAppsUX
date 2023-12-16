import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Clipboard24Filled, Clipboard24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const CopyIcon = bundleIcon(Clipboard24Filled, Clipboard24Regular);

export interface CopyMenuItemProps {
  onClick: (e: any) => void;
  isTrigger?: boolean;
  showKey?: boolean;
}

export const CopyMenuItem = (props: CopyMenuItemProps) => {
  const { onClick, isTrigger = false, showKey = false } = props;

  const intl = useIntl();

  const copyAction = intl.formatMessage({
    defaultMessage: 'Copy Action',
    description: 'Copy Action text',
  });
  const copyTrigger = intl.formatMessage({
    defaultMessage: 'Copy Trigger',
    description: 'Copy Trigger text',
  });
  // const copyDisabledText = intl.formatMessage({
  //   defaultMessage: 'This Action/Trigger cannot be copied.',
  //   description: 'Text to explain this action/trigger cannot be copied',
  // });
  const copyKeyboardText = intl.formatMessage({
    defaultMessage: 'Ctrl+C',
    description: '"Copy" keyboard command text',
  });

  const titleText = isTrigger ? copyTrigger : copyAction;

  return (
    <MenuItem key={titleText} icon={<CopyIcon />} secondaryContent={showKey ? copyKeyboardText : undefined} onClick={onClick}>
      {titleText}
    </MenuItem>
  );
};
