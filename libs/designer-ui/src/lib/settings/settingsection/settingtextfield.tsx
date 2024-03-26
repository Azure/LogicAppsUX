import type { SettingProps } from './';
import { TextField } from '@fluentui/react';
import React, { useState } from 'react';
import type { FormEvent } from 'react';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps extends SettingProps {
  id?: string;
  value: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  readOnly?: boolean;
  required?: boolean;
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
}): JSX.Element | null => {
  const [textValue, setTextValue] = useState(value ?? '');
  const handleTextInputChange = (_: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined): void => {
    setTextValue(newValue ?? '');
    onValueChange?.(_, newValue);
  };

  return (
    <>
      {customLabel ? customLabel : null}
      <TextField
        className="msla-setting-section-textField"
        id={id}
        label={!customLabel ? label : ''}
        ariaLabel={ariaLabel}
        value={textValue}
        defaultValue={defaultValue}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        onChange={handleTextInputChange}
      />
    </>
  );
};
