import type { SettingProps } from './settingtoggle';
import type { ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTextFieldProps extends SettingProps {
  id?: string;
  value?: string;
  label?: string;
  onValueChange?: TextInputChangeHandler;
}

export const SettingTextField: React.FC<SettingTextFieldProps> = ({
  value,
  id,
  readOnly,
  label,
  customLabel,
  onValueChange,
}): JSX.Element => {
  const [textVal, setVal] = useState(value ?? '');
  const handleTextInputChange = (_: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined): void => {
    setVal(newValue ?? '');
    onValueChange?.(_, newValue);
  };

  const intl = useIntl();
  const textFieldLabel = intl.formatMessage({
    defaultMessage: 'Setting Label',
    description: 'Label for text field input',
  });
  const textFieldAriaLabel = intl.formatMessage({
    defaultMessage: `Label setting`,
    description: 'Accessibility Label for text input field',
  });
  const settingPlaceholder = intl.formatMessage({
    defaultMessage: 'Setting Value',
    description: 'A placeholder for the setting text input field',
  });
  const textFieldStyles: Partial<ITextFieldStyles> = {
    fieldGroup: { height: 24, width: '100%', display: 'inline', marginRight: 8 },
    wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center', paddingLeft: 35 },
  };

  return (
    <TextField
      className="msla-setting-section-textField"
      id={id}
      label={label}
      onRenderLabel={customLabel} //custom render fn
      ariaLabel={textFieldAriaLabel}
      value={textVal}
      placeholder={settingPlaceholder}
      styles={textFieldStyles}
      disabled={readOnly}
      onChange={handleTextInputChange}
    />
  );
};
