import { Icon } from '@fluentui/react';
import { MenuItem } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface ResubmitMenuItemProps {
  onClick: (e: any) => void;
}

export const ResubmitMenuItem = (props: ResubmitMenuItemProps) => {
  const { onClick } = props;

  const intl = useIntl();

  const resubmitDescription = intl.formatMessage({
    defaultMessage: 'Resubmit a workflow run from this action',
    id: '4b437fb7114e',
    description: 'accessibility text for the resubmit button',
  });
  const resubmitButtonText = intl.formatMessage({
    defaultMessage: 'Submit from this action',
    id: '23ef39355993',
    description: 'Button label for submitting a workflow to rerun from this action',
  });

  return (
    <MenuItem key={resubmitDescription} icon={<Icon iconName="PlaybackRate1x" />} onClick={onClick}>
      {resubmitButtonText}
    </MenuItem>
  );
};
