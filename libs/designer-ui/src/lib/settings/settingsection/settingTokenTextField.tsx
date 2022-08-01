import type { Token, ValueSegment } from '../../editor';
import { TokenType, ValueSegmentType } from '../../editor';
import { BaseEditor } from '../../editor/base';
import type { TextInputChangeHandler } from './settingtextfield';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import { guid } from '@microsoft-logic-apps/utils';
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
        initialValue={value.map((x: ValueSegment) => {
          if (x.type === ValueSegmentType.TOKEN) {
            const { brandColor, description, icon, isSecure, name, required, title } = x.token as Token;
            return {
              id: guid(),
              type: x.type,
              token: {
                key: title ?? name ?? '',
                tokenType: TokenType.OUTPUTS,
                brandColor,
                description,
                icon: `url("${icon}")`,
                isSecure,
                required,
                title: title ?? name ?? '',
              },
              value: x.value,
            };
          } else {
            return {
              id: guid(),
              type: ValueSegmentType.LITERAL,
              value: x.value,
            };
          }
        })}
      />
    </>
  );
};
