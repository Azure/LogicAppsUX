import { ArrayEditor } from '../../arrayeditor';
import { Combobox } from '../../combobox';
import { DictionaryEditor } from '../../dictionary';
import type { Token, ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import type { ChangeHandler, Segment } from '../../editor/base';
import { SchemaEditor } from '../../schemaeditor';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import React from 'react';
import { StringEditor } from '../../editor/string';

export interface SettingTokenFieldProps extends SettingProps {
  id?: string;
  value: ValueSegment[];
  editor?: string;
  editorOptions?: any;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  tokenEditor: true;
  required?: boolean;
  viewModel?: any;
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
      {getEditor(props)}
    </>
  );
};

const getEditor = ({ editor, editorOptions, placeholder, readOnly, value, viewModel, onValueChange }: SettingTokenFieldProps) => {
  switch (editor?.toLowerCase()) {
    case 'combobox':
      // eslint-disable-next-line no-case-declarations
      const options = editorOptions.options.map((option: any, index: number) => ({ key: index.toString(), ...option }));
      return (
        <Combobox
          placeholder={placeholder}
          readOnly={readOnly}
          initialValue={value}
          options={options}
          useOption={true}
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
          initialValue={getSegments(value)}
          initialItems={viewModel.items}
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
          initialValue={getSegments(value)} // Need to update to use value segments directly
          onChange={onValueChange}
        />
      );

    default:
      // TODO - Might need to create another editor which is just parsing the value here and calling onChange in store.
      return (
        <StringEditor
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: true }}
          readonly={readOnly}
          initialValue={getSegments(value)} // TODO - Change Segment to ValueSegment here.
          onChange={onValueChange}
        />
      );
  }
};

const getSegments = (value: ValueSegment[]): Segment[] => {

  return value.map((x: ValueSegment) => {
    if (x.type === ValueSegmentType.TOKEN) {
      const { brandColor, description, icon, isSecure, name, required, title } = x.token as Token;
      return {
        type: x.type,
        token: {
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
        type: ValueSegmentType.LITERAL,
        value: x.value,
      };
    }
  });
};
