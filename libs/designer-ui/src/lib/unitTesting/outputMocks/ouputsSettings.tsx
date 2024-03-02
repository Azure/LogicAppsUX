import { SettingTokenField } from '../../settings/settingsection';

export interface OutputsSettingsProps {
  outputs: any[];
}

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ outputs }): JSX.Element => {
  return (
    <>
      {outputs.map((output: any) => (
        <div key={output.id}>
          <SettingTokenField
              {...output}
            />
        </div>
      ))}
    </>
  );
};
