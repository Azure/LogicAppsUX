import { Label, Dropdown, type IDropdownOption } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const ActionResult = (): JSX.Element => {
  const intl = useIntl();

  const intlText = {
    ACTION_RESULT: intl.formatMessage({
      defaultMessage: 'Action Result',
      description: 'The label for the action result dropdown in the unit test panel.',
    }),
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'Is successful',
      description: 'Successful action result',
    }),
    TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'Timed out',
      description: 'Timed action result',
    }),
    SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'Is skipped',
      description: 'Skipped action result',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'Has failed',
      description: 'Failed action result',
    }),
  };

  const labelId = 'dropdown-label-action-result';
  const options: IDropdownOption[] = [
    { key: 'success', text: intlText.SUCCEEDED_STATUS },
    { key: 'timedOut', text: intlText.TIMEDOUT_STATUS },
    { key: 'skipped', text: intlText.SKIPPED_STATUS },
    { key: 'failed', text: intlText.FAILED_STATUS },
  ];

  return (
    <>
      <Label id={labelId}>{intlText.ACTION_RESULT}</Label>
      <Dropdown aria-labelledby={labelId} className={'msla-output-mocks-actions-dropdown'} options={options} />
    </>
  );
};
