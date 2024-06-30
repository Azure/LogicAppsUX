import { useCallback } from 'react';
import { TextField, type ITextFieldProps } from '@fluentui/react';
import type { ChangeState } from 'lib/editor/base';

export interface ErrorDetailsProps {
  errorMessage: string;
  onErrorMessageChange: (value: string) => void;
  errorCode: string;
  onErrorCodeChange: (value: string) => void;
  onMockUpdate: (id: string, newState: ChangeState, type: string) => void; // Added prop
}

const ErrorDetails: React.FC<ErrorDetailsProps> = ({ errorMessage, onErrorMessageChange, errorCode, onErrorCodeChange, onMockUpdate }) => {
  const handleErrorMessageChange: ITextFieldProps['onChange'] = useCallback(
    (_: any, newValue: string | undefined) => {
      if (newValue !== undefined) {
        onErrorMessageChange(newValue);
        onMockUpdate('errorMessage', { value: newValue } as unknown as ChangeState, 'string'); // Trigger mock update
      }
    },
    [onErrorMessageChange, onMockUpdate]
  );

  const handleErrorCodeChange: ITextFieldProps['onChange'] = useCallback(
    (_: any, newValue: string | undefined) => {
      if (newValue !== undefined) {
        onErrorCodeChange(newValue);
        onMockUpdate('errorCode', { value: newValue } as unknown as ChangeState, 'string'); // Trigger mock update
      }
    },
    [onErrorCodeChange, onMockUpdate]
  );

  return (
    <div className="error-fields">
      <TextField label="Error Message" value={errorMessage} onChange={handleErrorMessageChange} />
      <TextField label="Error Code" value={errorCode} onChange={handleErrorCodeChange} />
    </div>
  );
};

export default ErrorDetails;
