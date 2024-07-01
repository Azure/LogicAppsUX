import { SettingTokenField } from '../../settings/settingsection';
import { ActionResults, type OutputsField } from './outputMocks';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';

export interface OutputsSettingsProps {
  outputs: OutputsField[];
  nodeId: string;
  actionResult: string;
}

const VALUE_KEY = 'value';

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ nodeId, outputs, actionResult }): JSX.Element => {
  const hasMockOutputs = actionResult === ActionResults.SUCCESS || ActionResults.FAILED;

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
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></> // Render nothing when action result is not SUCCESS
  );
};
