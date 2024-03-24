import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Clipboard24Filled, Clipboard24Regular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { isApple } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const CopyIcon = bundleIcon(Clipboard24Filled, Clipboard24Regular);

export interface CopyMenuItemProps {
  onClick: (e: unknown) => void;
  isTrigger?: boolean;
  showKey?: boolean;
}

export const CopyMenuItem = (props: CopyMenuItemProps) => {
  const { onClick, isTrigger = false, showKey = false } = props;

  const intl = useIntl();

  const copyAction = intl.formatMessage({
    defaultMessage: 'Copy Action',
    id: 'i1vHaT',
    description: 'Copy Action text',
  });
  const copyTrigger = intl.formatMessage({
    defaultMessage: 'Copy Trigger',
    id: 'oRxmXb',
    description: 'Copy Trigger text',
  });
  const copyKeyboardTextWin = intl.formatMessage({
    defaultMessage: 'Ctrl+C',
    id: 'snJFUi',
    description: '"Copy" keyboard command text for Windows',
  });
  const copyKeyboardTextMac = intl.formatMessage({
    defaultMessage: '⌘+C',
    id: '/c1l10',
    description: '"Copy" keyboard command text for Mac',
  });
  const copyKeyboardText = isApple() ? copyKeyboardTextMac : copyKeyboardTextWin;

  const titleText = isTrigger ? copyTrigger : copyAction;

  const onCopyClick = useCallback<CopyMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'CopyMenuItem:onCopyClick',
        args: [isTrigger ? 'trigger' : 'action'],
        level: LogEntryLevel.Verbose,
        message: 'Action copied.',
      });
    },
    [isTrigger, onClick]
  );

  return (
    <MenuItem key={titleText} icon={<CopyIcon />} secondaryContent={showKey ? copyKeyboardText : undefined} onClick={onCopyClick}>
      {titleText}
    </MenuItem>
  );
};
