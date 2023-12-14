import { Label, Dropdown } from '@fluentui/react';
import type { ConnectionParameterSets } from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';

export interface ConnectionMultiAuthInputProps {
  isLoading: boolean;
  value: number;
  onChange: (_event: FormEvent<HTMLDivElement>, item: any) => void;
  connectionParameterSets: ConnectionParameterSets | undefined;
}

const ConnectionMultiAuthInput = ({ isLoading, value, onChange, connectionParameterSets }: ConnectionMultiAuthInputProps) => {
  return (
    <div className="param-row">
      <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
        {connectionParameterSets?.uiDefinition?.displayName}
      </Label>
      <Dropdown
        id="connection-param-set-select"
        className="connection-parameter-input"
        selectedKey={value}
        onChange={onChange}
        disabled={isLoading}
        ariaLabel={connectionParameterSets?.uiDefinition?.description}
        placeholder={connectionParameterSets?.uiDefinition?.description}
        options={
          connectionParameterSets?.values.map((paramSet, index) => ({
            key: index,
            text: paramSet?.uiDefinition?.displayName ?? paramSet?.name,
          })) ?? []
        }
      />
    </div>
  );
};

export default ConnectionMultiAuthInput;
