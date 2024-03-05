import { SettingTokenField } from '../../settings/settingsection';
import { ActionResults } from './actionResult';
import { Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface OutputsSettingsProps {
  outputs: any[];
  mockResult: string | undefined;
}

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ outputs, mockResult }): JSX.Element => {
  const intl = useIntl();
  const hasMockOutputs = mockResult === ActionResults.SUCCESS || mockResult === undefined;

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
        <div key={output.id}>
          <SettingTokenField {...output} />
        </div>
      ))}
    </>
  ) : (
    <Text>{intlText.NO_OUTPUTS}</Text>
  );
};
