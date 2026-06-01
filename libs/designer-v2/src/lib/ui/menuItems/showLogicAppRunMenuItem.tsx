import { MenuItem } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

import { bundleIcon, FlowFilled, FlowRegular } from '@fluentui/react-icons';

const FlowIcon = bundleIcon(FlowFilled, FlowRegular);

export interface ShowLogicAppRunMenuItemProps {
  onClick: (e: any) => void;
}

export const ShowLogicAppRunMenuItem = (props: ShowLogicAppRunMenuItemProps) => {
  const { onClick } = props;
  const intl = useIntl();

  const showLogicAppRunText = intl.formatMessage({
    defaultMessage: 'Show Logic App run',
    id: 'TqgntN',
    description: 'Button label to navigate to the nested workflow run details',
  });

  return (
    <MenuItem key={showLogicAppRunText} icon={<FlowIcon />} onClick={onClick}>
      {showLogicAppRunText}
    </MenuItem>
  );
};
