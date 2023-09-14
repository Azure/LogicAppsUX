import type { SettingProps } from './settingtoggle';
import type { ITextFieldStyles } from '@fluentui/react';
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
  const [textVal, setVal] = useState(value ?? '');
  const handleTextInputChange = (_: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined): void => {
    setVal(newValue ?? '');
    onValueChange?.(_, newValue);
  };
  const textFieldStyles: Partial<ITextFieldStyles> = {
    fieldGroup: { height: 24, width: '100%', display: 'inline', marginRight: 8 },
    wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center', paddingLeft: 35 },
  };

  return (
    <>
      {customLabel && customLabel()}
      <TextField
        className="msla-setting-section-textField"
        id={id}
        label={!customLabel ? label : ''}
        ariaLabel={ariaLabel}
        value={textVal}
        defaultValue={defaultValue}
        placeholder={placeholder}
        styles={textFieldStyles}
        readOnly={readOnly}
        required={required}
        onChange={handleTextInputChange}
      />
    </>
  );
};
