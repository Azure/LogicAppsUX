import { TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { Label } from '@microsoft/designer-ui';

export interface ConnectionNameInputProps {
  isLoading: boolean;
  value: string;
  onChange: (event: any, newValue?: string) => void;
}

const ConnectionNameInput = ({ isLoading, value, onChange }: ConnectionNameInputProps) => {
  const intl = useIntl();
  const inputConnectionDisplayNameLabel = intl.formatMessage({
    defaultMessage: 'Connection name',
    id: 'msb92af75972b1',
    description: 'Connection Name',
  });
  const inputConnectionDisplayNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter a name for the connection',
    id: 'ms52dc91087458',
    description: 'Placeholder text for connection name input',
  });

  return (
    <div className="param-row">
      <Label
        className="label"
        isRequiredField={true}
        text={inputConnectionDisplayNameLabel}
        htmlFor={'connection-display-name-input'}
        disabled={isLoading}
      />
      <TextField
        id={'connection-display-name-input'}
        className="connection-parameter-input"
        disabled={isLoading}
        autoComplete="off"
        aria-label={inputConnectionDisplayNamePlaceholder}
        placeholder={inputConnectionDisplayNamePlaceholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export default ConnectionNameInput;
