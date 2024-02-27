import { Label, TextField } from '@fluentui/react';
import { type OutputInfo } from '@microsoft/designer-client-services-logic-apps';

export interface OutputsSettingsProps {
  outputs: Record<string, OutputInfo>;
}

export const OutputsSettings: React.FC<OutputsSettingsProps> = ({ outputs }): JSX.Element => {
  return (
    <>
      {Object.values(outputs).map((output: OutputInfo) => (
        <div key={output.key}>
          <div className="msla-input-parameter-label">
            <Label id={output.name} className="msla-label">
              {output.title}
            </Label>
          </div>
          <TextField className="msla-setting-token-editor-container" />
        </div>
      ))}
    </>
  );
};
