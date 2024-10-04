import { Dropdown } from '@fluentui/react';
import type { ConnectionParameterSets } from '@microsoft/logic-apps-shared';
import type { FormEvent } from 'react';
import { Label } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export interface ConnectionMultiAuthInputProps {
  isLoading: boolean;
  value: number;
  onChange: (_event: FormEvent<HTMLDivElement>, item: any) => void;
  connectionParameterSets: ConnectionParameterSets | undefined;
}

const ConnectionMultiAuthInput = ({ isLoading, value, onChange, connectionParameterSets }: ConnectionMultiAuthInputProps) => {
  const intl = useIntl();
  const authType = intl.formatMessage({
    id: 'ClowJ/',
    defaultMessage: 'Authentication type',
    description: 'Label for multi auth options',
  });
  return (
    <div className="param-row">
      <Label
        className="label"
        isRequiredField={true}
        text={connectionParameterSets?.uiDefinition?.displayName ?? authType}
        htmlFor={'connection-param-set-select'}
        disabled={isLoading}
      />
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
