import { Label, TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface ConnectionNameInputProps {
  isLoading: boolean;
  value: string;
  onChange: (event: any, newValue?: string) => void;
}

const ConnectionNameInput = ({ isLoading, value, onChange }: ConnectionNameInputProps) => {
  const intl = useIntl();
  const inputConnectionDisplayNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    id: 'OKszbi',
    description: 'Connection Name',
  });
  const inputConnectionDisplayNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter a name for the connection',
    id: 'UtyRCH',
    description: 'Placeholder text for connection name input',
  });

  return (
    <div className="param-row">
      <Label className="label" required htmlFor={'connection-display-name-input'} disabled={isLoading}>
        {inputConnectionDisplayNameLabel}
      </Label>
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
