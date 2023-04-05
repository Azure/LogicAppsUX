import { ArrayEditor, ArrayType } from '../../arrayeditor';
import { AuthenticationEditor } from '../../authentication';
import { CodeEditor } from '../../code';
import { Combobox } from '../../combobox';
import { CopyInputControl } from '../../copyinputcontrol';
import { DictionaryEditor } from '../../dictionary';
import { DropdownEditor } from '../../dropdown';
import type { ValueSegment } from '../../editor';
import type { CallbackHandler, ChangeHandler, GetTokenPickerHandler } from '../../editor/base';
import { EditorLanguage } from '../../editor/monaco';
import { StringEditor } from '../../editor/string';
import type { PickerInfo } from '../../picker/filepickereditor';
import { FilePickerEditor } from '../../picker/filepickereditor';
import { QueryBuilderEditor } from '../../querybuilder';
import { UntilEditor } from '../../querybuilder/Until';
import { ScheduleEditor } from '../../recurrence';
import { SchemaEditor } from '../../schemaeditor';
import { TableEditor } from '../../table';
import type { TokenGroup } from '../../tokenpicker/models/token';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';

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
  pickerInfo?: PickerInfo;
  onValueChange?: ChangeHandler;
  onComboboxMenuOpen?: CallbackHandler;
  getTokenPicker: GetTokenPickerHandler;
  validationErrors?: string[];
  hideValidationErrors?: ChangeHandler;
}

export const SettingTokenField = ({ ...props }: SettingTokenFieldProps) => {
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
  label,
  // pickerInfo,
  onValueChange,
  onComboboxMenuOpen,
  hideValidationErrors,
  getTokenPicker,
}: SettingTokenFieldProps) => {
  const dropdownOptions = editorOptions?.options?.value ?? editorOptions?.options ?? [];

  switch (editor?.toLowerCase()) {
    case 'copyable':
      return <CopyInputControl placeholder={placeholder} text={value[0].value} />;

    case 'dropdown':
      return (
        <DropdownEditor
          readonly={readOnly}
          initialValue={value}
          options={dropdownOptions.map((option: any, index: number) => ({ key: index.toString(), ...option }))}
          multiSelect={!!editorOptions?.multiSelect}
          serialization={editorOptions?.serialization}
          onChange={onValueChange}
        />
      );

    case 'code':
      return (
        <CodeEditor
          initialValue={value}
          getTokenPicker={getTokenPicker}
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
          options={dropdownOptions.map((option: any, index: number) => ({ key: index.toString(), ...option }))}
          useOption={true}
          isTrigger={isTrigger}
          isLoading={isLoading}
          errorDetails={errorDetails}
          getTokenPicker={getTokenPicker}
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
          getTokenPicker={getTokenPicker}
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
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
        />
      );

    case 'array':
      return (
        <ArrayEditor
          type={editorViewModel.schema ? ArrayType.COMPLEX : ArrayType.SIMPLE}
          labelProps={{ text: label ? `${label} Item` : 'Array Item' }}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          isTrigger={isTrigger}
          getTokenPicker={getTokenPicker}
          itemSchema={editorViewModel?.schema}
          onChange={onValueChange}
        />
      );

    case 'authentication':
      return (
        <AuthenticationEditor
          initialValue={value}
          options={editorOptions}
          type={editorViewModel.type}
          authenticationValue={editorViewModel.authenticationValue}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          BasePlugins={{ tokens: showTokens }}
        />
      );

    case 'condition':
      return editorViewModel.isOldFormat ? (
        <UntilEditor
          readonly={readOnly}
          items={JSON.parse(JSON.stringify(editorViewModel.items))}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
        />
      ) : (
        <QueryBuilderEditor
          readonly={readOnly}
          groupProps={JSON.parse(JSON.stringify(editorViewModel.items))}
          onChange={onValueChange}
          getTokenPicker={getTokenPicker}
        />
      );

    case 'recurrence':
      return <ScheduleEditor readOnly={readOnly} type={editorOptions?.recurrenceType} initialValue={value} onChange={onValueChange} />;

    case 'filepicker':
      // console.log(pickerInfo);
      return (
        <FilePickerEditor
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          isTrigger={isTrigger}
          initialValue={value}
          editorBlur={onValueChange}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
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
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
        />
      );
  }
};
