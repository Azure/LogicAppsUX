import { ArrayEditor, ArrayType } from '../../arrayeditor';
import { AuthenticationEditor } from '../../authentication';
import { CodeEditor } from '../../code';
import { Combobox } from '../../combobox';
import { CopyInputControl } from '../../copyinputcontrol';
import { DictionaryEditor } from '../../dictionary';
import { DropdownEditor } from '../../dropdown';
import type { ValueSegment } from '../../editor';
import type { CallbackHandler, ChangeHandler, TokenPickerHandler } from '../../editor/base';
import { EditorLanguage } from '../../editor/monaco';
import { StringEditor } from '../../editor/string';
import { QueryBuilderEditor } from '../../querybuilder';
import { SchemaEditor } from '../../schemaeditor';
import { TableEditor } from '../../table';
import type { TokenGroup } from '../../tokenpicker/models/token';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import React from 'react';

export interface SettingTokenFieldProps extends SettingProps {
  id?: string;
  value: ValueSegment[];
  isLoading?: boolean;
  errorDetails?: { message: string };
  editor?: string;
  editorOptions?: any;
  editorViewModel?: any;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  readOnly?: boolean;
  tokenEditor: true;
  required?: boolean;
  showTokens?: boolean;
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  isTrigger?: boolean;
  onValueChange?: ChangeHandler;
  onComboboxMenuOpen?: CallbackHandler;
  tokenPickerHandler: TokenPickerHandler;
}

export const SettingTokenField: React.FC<SettingTokenFieldProps> = (props) => {
  return (
    <>
      <div className="msla-input-parameter-label">
        <Label className="msla-label" required={props.required}>
          {props.label}
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
  isTrigger,
  isLoading,
  errorDetails,
  showTokens,
  onValueChange,
  onComboboxMenuOpen,
  tokenPickerHandler,
}: SettingTokenFieldProps) => {
  switch (editor?.toLowerCase()) {
    case 'copyable':
      return <CopyInputControl placeholder={placeholder} text={value[0].value} />;

    case 'dropdown':
      // eslint-disable-next-line no-case-declarations
      const { options, multiSelect } = editorOptions;
      return (
        <DropdownEditor
          readonly={readOnly}
          initialValue={value}
          options={options.map((option: any, index: number) => ({ key: index.toString(), ...option }))}
          multiSelect={!!multiSelect}
          onChange={onValueChange}
        />
      );

    case 'code':
      return (
        <CodeEditor
          initialValue={value}
          tokenPickerHandler={tokenPickerHandler}
          language={EditorLanguage.javascript}
          onChange={onValueChange}
          isTrigger={isTrigger}
          readonly={readOnly}
          placeholder={placeholder}
        />
      );
    case 'combobox':
      return (
        <Combobox
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          options={editorOptions.options.map((option: any, index: number) => ({ key: index.toString(), ...option }))}
          useOption={true}
          isTrigger={isTrigger}
          isLoading={isLoading}
          errorDetails={errorDetails}
          tokenPickerHandler={tokenPickerHandler}
          onChange={onValueChange}
          onMenuOpen={onComboboxMenuOpen}
        />
      );

    case 'schema':
      return <SchemaEditor readonly={readOnly} initialValue={value} onChange={onValueChange} />;

    case 'dictionary':
      return (
        <DictionaryEditor
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          initialItems={editorViewModel.items}
          isTrigger={isTrigger}
          tokenPickerHandler={tokenPickerHandler}
          onChange={onValueChange}
        />
      );

    case 'table':
      return (
        <TableEditor
          readonly={readOnly}
          initialValue={value}
          initialItems={editorViewModel.items}
          columnMode={editorViewModel.columnMode}
          columns={editorOptions.columns.count}
          titles={editorOptions.columns.titles}
          keys={editorOptions.columns.keys}
          isTrigger={isTrigger}
          tokenPickerHandler={tokenPickerHandler}
          onChange={onValueChange}
        />
      );

    case 'array':
      return (
        <ArrayEditor
          type={ArrayType.SIMPLE}
          labelProps={{ text: 'Array Item' }}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          initialItems={editorViewModel?.items}
          itemSchema={'Array Item'}
          isTrigger={isTrigger}
          tokenPickerHandler={tokenPickerHandler}
          onChange={onValueChange}
        />
      );

    case 'authentication':
      // TODO - This requires update
      return (
        <AuthenticationEditor
          initialValue={value}
          options={editorOptions}
          type={editorViewModel.type}
          authenticationValue={editorViewModel.authenticationValue}
          tokenPickerHandler={tokenPickerHandler}
          onChange={onValueChange}
          BasePlugins={{ tokens: showTokens }}
        />
      );

    case 'condition':
      return (
        <QueryBuilderEditor
          groupProps={JSON.parse(JSON.stringify(editorViewModel.items))}
          onChange={onValueChange}
          tokenPickerHandler={tokenPickerHandler}
        />
      );

    default:
      return (
        <StringEditor
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          isTrigger={isTrigger}
          initialValue={value}
          editorBlur={onValueChange}
          tokenPickerHandler={tokenPickerHandler}
        />
      );
  }
};
