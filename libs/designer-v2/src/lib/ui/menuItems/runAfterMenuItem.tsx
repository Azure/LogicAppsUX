import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, BranchFork24Filled, BranchFork24Regular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const RunAfterIcon = bundleIcon(BranchFork24Filled, BranchFork24Regular);

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
    defaultMessage: 'Run after',
    id: '8p0yK8',
    description: 'Button label for checking the action that this operation runs after',
  });

  const titleText = runAfterMessage;

  const onRunAfterClick = useCallback<RunAfterMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'RunAfterMenuItem:onRunAfterClick',
        args: [isScope ? 'scope' : isTrigger ? 'trigger' : 'action'],
        level: LogEntryLevel.Verbose,
        message: 'Clicked Run After In Context Menu.',
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
