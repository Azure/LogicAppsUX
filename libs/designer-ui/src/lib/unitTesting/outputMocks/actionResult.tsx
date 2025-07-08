import { ActionResults, type ActionResultUpdateHandler } from './outputMocks';
import { Label, Dropdown, type IDropdownOption } from '@fluentui/react';
import { mergeClasses } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useOutputMocksStyles } from './outputMocks.styles';

export interface ActionResultProps {
  nodeId: string;
  onActionResultUpdate: ActionResultUpdateHandler;
  actionResult: string;
}

export const ActionResult: React.FC<ActionResultProps> = ({ nodeId, onActionResultUpdate, actionResult }): JSX.Element => {
  const intl = useIntl();
  const styles = useOutputMocksStyles();

  const intlText = {
    ACTION_RESULT: intl.formatMessage({
      defaultMessage: 'Action Result',
      id: '5U6Dee',
      description: 'The label for the action result dropdown in the unit test panel.',
    }),
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'Is successful',
      id: 'HF2SNx',
      description: 'Successful action result',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'Has failed',
      id: 'cySYfO',
      description: 'Failed action result',
    }),
  };

  const labelId = `dropdown-label-action-result-${nodeId}`;
  const options: IDropdownOption[] = [
    { key: ActionResults.SUCCESS, text: intlText.SUCCEEDED_STATUS },
    { key: ActionResults.FAILED, text: intlText.FAILED_STATUS },
  ];

  const onChangeActionResult = (_event: React.FormEvent<HTMLDivElement>, selectedOption?: IDropdownOption) => {
    if (selectedOption) {
      onActionResultUpdate({ actionResult: selectedOption.key as string });
    }
  };

  return (
    <>
      <Label id={labelId}>{intlText.ACTION_RESULT}</Label>
      <Dropdown
        aria-labelledby={labelId}
        className={mergeClasses(styles.actionsDropdown, 'msla-output-mocks-actions-dropdown')}
        options={options}
        onChange={onChangeActionResult}
        selectedKey={actionResult}
      />
    </>
  );
};
