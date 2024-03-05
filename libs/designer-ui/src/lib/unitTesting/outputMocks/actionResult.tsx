import { ActionResults, type MockUpdateHandler } from './outputMocks';
import { Label, Dropdown, type IDropdownOption } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface ActionResultProps {
  nodeId: string;
  onMockUpdate: MockUpdateHandler;
  mockResult: string | undefined;
}

export const ActionResult: React.FC<ActionResultProps> = ({ nodeId, onMockUpdate, mockResult }): JSX.Element => {
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

  const labelId = `dropdown-label-action-result-${nodeId}`;
  const options: IDropdownOption[] = [
    { key: ActionResults.SUCCESS, text: intlText.SUCCEEDED_STATUS },
    { key: ActionResults.TIMEDOUT, text: intlText.TIMEDOUT_STATUS },
    { key: ActionResults.SKIPPED, text: intlText.SKIPPED_STATUS },
    { key: ActionResults.FAILED, text: intlText.FAILED_STATUS },
  ];

  const onChangeActionResult = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      onMockUpdate({ id: nodeId, actionResult: selectedOption.key as string });
    }
  };

  return (
    <>
      <Label id={labelId}>{intlText.ACTION_RESULT}</Label>
      <Dropdown
        aria-labelledby={labelId}
        className={'msla-output-mocks-actions-dropdown'}
        options={options}
        defaultSelectedKey={ActionResults.SUCCESS}
        onChange={onChangeActionResult}
        selectedKey={mockResult}
      />
    </>
  );
};
