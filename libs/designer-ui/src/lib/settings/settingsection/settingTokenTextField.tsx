import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { BaseEditor } from '../../editor/base';
import { Label } from '@fluentui/react';
import React from 'react';
import type { FormEvent } from 'react';

export type TextInputChangeHandler = (event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string | undefined) => void;

export interface SettingTokenTextFieldProps {
  id?: string;
  value: ValueSegment[];
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  tokenEditor: true;
  onValueChange?: TextInputChangeHandler;
}
export const SettingTokenTextField: React.FC<SettingTokenTextFieldProps> = ({ value, placeholder, label, readOnly }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="msla-input-parameter-label">
        <Label className="msla-label">{label.toUpperCase()}</Label>
      </div>
      <BaseEditor
        className="msla-setting-token-editor-container"
        placeholder={placeholder}
        BasePlugins={{ tokens: true }}
        readonly={readOnly}
        initialValue={value.map((x) => {
          if (x.type === ValueSegmentType.TOKEN) {
            return {
              type: x.type,
              token: {
                icon: '',
                title: x.token?.source ?? '',
              },
            };
          } else {
            return {
              type: ValueSegmentType.LITERAL,
              value: x.value,
            };
          }
        })}
      />
    </div>
  );
};
