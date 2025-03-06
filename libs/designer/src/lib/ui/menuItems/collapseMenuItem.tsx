import { MenuItem } from '@fluentui/react-components';
import {
  bundleIcon,
  ArrowMinimize24Filled,
  ArrowMinimize24Regular,
  ArrowExpand24Filled,
  ArrowExpand24Regular,
} from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIsActionCollapsed } from '../../core/state/workflow/workflowSelectors';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const CollapseIcon = bundleIcon(ArrowMinimize24Filled, ArrowMinimize24Regular);
const ExpandIcon = bundleIcon(ArrowExpand24Filled, ArrowExpand24Regular);

export interface CollapseMenuItemProps {
  nodeId: string;
  onClick: (e: unknown) => void;
}

export const CollapseMenuItem: React.FC<CollapseMenuItemProps> = (props) => {
  const { nodeId, onClick } = props;

  const isNodeCollapsed = useIsActionCollapsed(nodeId);

  const intl = useIntl();

  const collapseAction = intl.formatMessage({
    defaultMessage: 'Collapse action',
    id: 'f4238542bad2',
    description: 'Text indicating a menu button to collapse an action in the designer',
  });

  const expandAction = intl.formatMessage({
    defaultMessage: 'Expand action',
    id: '440e13507d61',
    description: 'Text indicating a menu button to expand an action in the designer',
  });

  const handleClick = useCallback<CollapseMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'CollapseMenuItem:handleClick',
        args: [`isNodeCollapsed:${isNodeCollapsed}`],
        level: LogEntryLevel.Verbose,
        message: 'Action collapse/expand clicked.',
      });
    },
    [isNodeCollapsed, onClick]
  );

  return (
    <MenuItem
      key={`CollapseMenuItem.${nodeId}`}
      icon={isNodeCollapsed ? <ExpandIcon /> : <CollapseIcon />}
      onClick={handleClick}
      data-automation-id={'msla-collapse-menu-option'}
    >
      {isNodeCollapsed ? expandAction : collapseAction}
    </MenuItem>
  );
};
