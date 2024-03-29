import { SettingTokenField } from '../../settings/settingsection';
import { ActionResults, type OutputsField } from './outputMocks';
import { Text } from '@fluentui/react-components';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface OutputsSettingsProps {
  outputs: OutputsField[];
  nodeId: string;
  actionResult: string;
}

const VALUE_KEY = 'value';

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ nodeId, outputs, actionResult }): JSX.Element => {
  const intl = useIntl();
  const hasMockOutputs = actionResult === ActionResults.SUCCESS;

  const intlText = {
    NO_OUTPUTS: intl.formatMessage({
      defaultMessage:
        'Skipped, timed out, or failed actions do not support mocking outputs. Mocking is only supported for successful actions.',
      id: 'Sm3qmB',
      description: 'Unsupported message for actions output mocks',
    }),
  };

  return hasMockOutputs ? (
    <>
      {outputs.map((output: any) => (
        <div key={`${nodeId}-${output.id}`}>
          <SettingTokenField {...output} />
          {!isNullOrUndefined(output.validationErrors) && output.validationErrors[VALUE_KEY] && (
            <span className="msla-input-parameter-error" role="alert">
              {output.validationErrors[VALUE_KEY]}
            </span>
          )}
        </div>
      ))}
    </>
  ) : (
    <Text>{intlText.NO_OUTPUTS}</Text>
  );
};
