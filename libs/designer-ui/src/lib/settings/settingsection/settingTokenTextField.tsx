import type { ValueSegment } from '../../editor';
import { BaseEditor } from '../../editor/base';
import type { TextInputChangeHandler } from './settingtextfield';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import React from 'react';

export interface SettingTokenTextFieldProps extends SettingProps {
  id?: string;
  value: ValueSegment[];
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  tokenEditor: true;
  required?: boolean;
  onValueChange?: TextInputChangeHandler;
}
export const SettingTokenTextField: React.FC<SettingTokenTextFieldProps> = ({ value, placeholder, label, readOnly, required }) => {
  return (
    <>
      <div className="msla-input-parameter-label">
        <Label className="msla-label" required={required}>
          {label.toUpperCase()}
        </Label>
      </div>
      <BaseEditor
        className="msla-setting-token-editor-container"
        placeholder={placeholder}
        BasePlugins={{ tokens: true }}
        readonly={readOnly}
        initialValue={value}
      />
    </>
  );
};
