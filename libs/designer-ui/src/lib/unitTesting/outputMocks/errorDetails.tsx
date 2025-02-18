import type React from 'react';
import { TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';
import type { ChangeState } from '../../editor/base';

export interface ErrorDetailsProps {
  errorMessage: string;
  errorCode: string;
  onMockUpdate: (id: string, newState: ChangeState, type: string) => void;
}

const ErrorDetails: React.FC<ErrorDetailsProps> = ({ errorMessage, errorCode, onMockUpdate }) => {
  const intl = useIntl();

  const handleErrorMessageChange = (_event: any, newValue?: string) => {
    if (newValue !== undefined) {
      onMockUpdate('errorMessage', { value: newValue } as unknown as ChangeState, 'string');
    }
  };

  const handleErrorCodeChange = (_event: any, newValue?: string) => {
    if (newValue !== undefined) {
      onMockUpdate('errorCode', { value: newValue } as unknown as ChangeState, 'string');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <TextField
        label={intl.formatMessage({
          defaultMessage: 'Error Message',
          id: '805nCJ',
          description: 'Label for the error message input field',
        })}
        value={errorMessage}
        onChange={handleErrorMessageChange}
      />
      <TextField
        label={intl.formatMessage({
          defaultMessage: 'Error Code',
          id: 'gZRdSs',
          description: 'Label for the error code input field',
        })}
        value={errorCode}
        onChange={handleErrorCodeChange}
      />
    </div>
  );
};

export default ErrorDetails;
