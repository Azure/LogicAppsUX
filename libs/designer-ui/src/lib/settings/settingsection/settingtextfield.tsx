import { Input, Label } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import type { SettingProps } from './';
import type React from 'react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps extends SettingProps {
  id?: string;
  value: string | number;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  readOnly?: boolean;
  required?: boolean;
  max?: number;
  min?: number;
  type?: 'text' | 'number';
  onValueChange?: TextInputChangeHandler;
}

export const SettingTextField: React.FC<SettingTextFieldProps> = ({
  value,
  id,
  readOnly,
  required,
  label,
  placeholder,
  customLabel,
  onValueChange,
  defaultValue,
  ariaLabel,
  max,
  min,
  type,
}): JSX.Element | null => {
  const [textValue, setTextValue] = useState(value ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const intl = useIntl();
  const handleTextInputChange = (_e: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setTextValue(data.value);
    if (type === 'number') {
      setErrorMessage(validateNumber(Number(data.value), min, max));
    }
    onValueChange?.(_e, data.value);
  };

  const validateNumber = (num: number, min?: number, max?: number): string => {
    if (min && num < min) {
      return intl.formatMessage(
        {
          defaultMessage: 'Value should be greater than {min}',
          description: 'Error message for number input being lower than min',
          id: 'CRTB+v',
        },
        { min }
      );
    }
    if (max && num > max) {
      return intl.formatMessage(
        {
          defaultMessage: 'Value should be less than {max}',
          description: 'Error message for number input being lower than max',
          id: 'NtoWaY',
        },
        { max }
      );
    }
    return '';
  };

  return (
    <>
      {customLabel ? customLabel : <Label> {label} </Label>}
      <Input
        type={type}
        className="msla-setting-section-textField"
        id={id}
        aria-label={ariaLabel}
        value={textValue.toString()}
        defaultValue={defaultValue}
        placeholder={placeholder}
        readOnly={readOnly}
        max={max}
        min={min}
        required={required}
        onChange={handleTextInputChange}
      />
      {errorMessage && <div className="msla-error-text">{errorMessage}</div>}
    </>
  );
};
