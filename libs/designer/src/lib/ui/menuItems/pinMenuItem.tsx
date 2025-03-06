import { useIsNodePinnedToOperationPanel } from '../../core/state/panel/panelSelectors';
import { MenuItem } from '@fluentui/react-components';
import { bundleIcon, Pin24Filled, Pin24Regular, PinOff24Filled, PinOff24Regular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

const PinIcon = bundleIcon(Pin24Filled, Pin24Regular);
const UnpinIcon = bundleIcon(PinOff24Filled, PinOff24Regular);

export interface PinMenuItemProps {
  nodeId: string;
  onClick: (e: unknown) => void;
}

export const PinMenuItem: React.FC<PinMenuItemProps> = (props) => {
  const { nodeId, onClick } = props;

  const isNodePinned = useIsNodePinnedToOperationPanel(nodeId);

  const intl = useIntl();

  const pinAction = intl.formatMessage({
    defaultMessage: 'Pin action',
    id: 'ms6f668bf9fe8f',
    description: 'Text indicating a menu button to pin an action to the side panel',
  });

  const unpinAction = intl.formatMessage({
    defaultMessage: 'Unpin action',
    id: 'ms893cf5969a1a',
    description: 'Text indicating a menu button to unpin a pinned action from the side panel',
  });

  const handleClick = useCallback<PinMenuItemProps['onClick']>(
    (e) => {
      onClick(e);
      LoggerService().log({
        area: 'PinMenuItem:handleClick',
        args: [`isNodePinned:${isNodePinned}`],
        level: LogEntryLevel.Verbose,
        message: 'Action pin/unpin clicked.',
      });
    },
    [isNodePinned, onClick]
  );

  return (
    <MenuItem
      key={`PinMenuItem.${nodeId}`}
      icon={isNodePinned ? <UnpinIcon /> : <PinIcon />}
      onClick={handleClick}
      data-automation-id={'msla-pin-menu-option'}
    >
      {isNodePinned ? unpinAction : pinAction}
    </MenuItem>
  );
};
