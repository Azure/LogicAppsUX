import { Input, Label } from '@fluentui/react-components';
import type { InputOnChangeData } from '@fluentui/react-components';
import type { SettingProps } from './';
import type React from 'react';
import { useState } from 'react';
import type { FormEvent } from 'react';

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
  const handleTextInputChange = (_e: React.ChangeEvent<HTMLInputElement>, data: InputOnChangeData): void => {
    setTextValue(data.value);
    onValueChange?.(_e, data.value);
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
    </>
  );
};
