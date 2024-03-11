import { SettingTokenField } from '../../settings/settingsection';
import { ActionResults } from './outputMocks';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface OutputsSettingsProps {
  outputs: any[];
  nodeId: string;
  actionResult: string;
}

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ nodeId, outputs, actionResult }): JSX.Element => {
  const intl = useIntl();
  const hasMockOutputs = actionResult === ActionResults.SUCCESS;

  const intlText = {
    NO_OUTPUTS: intl.formatMessage({
      defaultMessage:
        'Skipped, timed out, or failed actions do not support mocking outputs. Mocking is only supported for successful actions.',
      description: 'Unsupported message for actions output mocks',
    }),
  };

  return hasMockOutputs ? (
    <>
      {outputs.map((output: any) => (
        <SettingTokenField key={`${nodeId}-${output.id}`} {...output} />
      ))}
    </>
  ) : (
    <Text>{intlText.NO_OUTPUTS}</Text>
  );
};
