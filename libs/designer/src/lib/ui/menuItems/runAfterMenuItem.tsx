import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Copy24Filled, Copy24Regular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const RunAfterIcon = bundleIcon(Copy24Filled, Copy24Regular);

export interface RunAfterMenuItemProps {
  onClick: (e: unknown) => void;
  isTrigger?: boolean;
  isScope?: boolean;
  showKey?: boolean;
}

export const RunAfterMenuItem = (props: RunAfterMenuItemProps) => {
  const { onClick, isTrigger = false, isScope = false } = props;

  const intl = useIntl();

  const runAfterMessage = intl.formatMessage({
    defaultMessage: 'Run After',
    id: 'rioocq',
    description: 'Run After text',
  });

  const titleText = runAfterMessage;

  const onRunAfterClick = useCallback<RunAfterMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'RunAfterMenuItem:onRunAfterClick',
        args: [isScope ? 'scope' : isTrigger ? 'trigger' : 'action'],
        level: LogEntryLevel.Verbose,
        message: 'Clicked Run After.',
      });
    },
    [isScope, isTrigger, onClick]
  );

  return (
    <MenuItem
      key={titleText}
      icon={<RunAfterIcon />}
      secondaryContent={undefined}
      onClick={onRunAfterClick}
      data-automation-id={'msla-run-after-menu-option'}
    >
      {titleText}
    </MenuItem>
  );
};
