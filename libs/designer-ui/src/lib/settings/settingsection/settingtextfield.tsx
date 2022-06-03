import type { ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import React from 'react';
import type { FormEvent } from 'react';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps {
  id?: string;
  value: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  onValueChange?: TextInputChangeHandler;
}

export const SettingTextField: React.FC<SettingTextFieldProps> = ({
  value,
  id,
  defaultValue,
  readOnly,
  placeholder,
  label,
  onValueChange,
}): JSX.Element => {
  const textFieldStyles: Partial<ITextFieldStyles> = {
    fieldGroup: { height: 24, width: '100%', display: 'inline', marginRight: 8 },
    wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center', paddingLeft: 35 },
  };

  return (
    <TextField
      className="msla-setting-section-textField"
      id={id}
      label={label}
      ariaLabel={label}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      styles={textFieldStyles}
      readOnly={readOnly}
      onChange={onValueChange}
    />
  );
};
