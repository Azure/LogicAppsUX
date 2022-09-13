import { ArrayEditor } from '../../arrayeditor';
import { Combobox } from '../../combobox';
import { DictionaryEditor } from '../../dictionary';
import type { ValueSegment } from '../../editor';
import type { ChangeHandler } from '../../editor/base';
import { StringEditor } from '../../editor/string';
import { SchemaEditor } from '../../schemaeditor';
import type { TokenGroup } from '../../tokenpicker/models/token';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import React from 'react';

export interface SettingTokenFieldProps extends SettingProps {
  id?: string;
  value: ValueSegment[];
  editor?: string;
  editorOptions?: any;
  editorViewModel?: any;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  tokenEditor: true;
  required?: boolean;
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  onValueChange?: ChangeHandler;
}

export const SettingTokenField: React.FC<SettingTokenFieldProps> = (props) => {
  return (
    <>
      <div className="msla-input-parameter-label">
        <Label className="msla-label" required={props.required}>
          {props.label.toUpperCase()}
        </Label>
      </div>
      <TokenField {...props} />
    </>
  );
};

const TokenField = ({
  editor,
  editorOptions,
  editorViewModel,
  placeholder,
  readOnly,
  value,
  GetTokenPicker,
  onValueChange,
}: SettingTokenFieldProps) => {
  switch (editor?.toLowerCase()) {
    case 'combobox':
      // eslint-disable-next-line no-case-declarations
      const options = editorOptions.options.map((option: any, index: number) => ({ key: index.toString(), ...option }));
      return (
        <Combobox
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          options={options}
          useOption={true}
          GetTokenPicker={GetTokenPicker}
          onChange={onValueChange}
        />
      );

    case 'schema':
      return <SchemaEditor placeholder={placeholder} disabled={readOnly} initialValue={value} onChange={onValueChange} />;

    case 'dictionary':
      return (
        <DictionaryEditor
          placeholder={placeholder}
          readOnly={readOnly}
          initialValue={value}
          initialItems={editorViewModel.items}
          GetTokenPicker={GetTokenPicker}
          onChange={onValueChange}
        />
      );

    case 'array':
      // TODO - This requires update
      return (
        <ArrayEditor
          labelProps={{ text: '' }}
          placeholder={placeholder}
          readOnly={readOnly}
          initialValue={value}
          GetTokenPicker={GetTokenPicker}
          onChange={onValueChange}
        />
      );

    default:
      return (
        <StringEditor
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: true }}
          readonly={readOnly}
          initialValue={value}
          GetTokenPicker={GetTokenPicker}
          onChange={onValueChange}
        />
      );
  }
};
