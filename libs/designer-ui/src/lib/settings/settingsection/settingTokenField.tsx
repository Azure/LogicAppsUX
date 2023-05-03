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
import { FloatingActionMenu } from '../../floatingactionmenu';
// import { HTMLEditor } from '../../html';
import type { PickerCallbackHandlers } from '../../picker/filepickereditor';
import { FilePickerEditor } from '../../picker/filepickereditor';
import { QueryBuilderEditor } from '../../querybuilder';
import { SimpleQueryBuilder } from '../../querybuilder/SimpleQueryBuilder';
import { ScheduleEditor } from '../../recurrence';
import { SchemaEditor } from '../../schemaeditor';
import { TableEditor } from '../../table';
import type { TokenGroup } from '../../tokenpicker/models/token';
import { useId } from '../../useId';
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
  isCallback?: boolean;
  onValueChange?: ChangeHandler;
  onComboboxMenuOpen?: CallbackHandler;
  pickerCallbacks?: PickerCallbackHandlers;
  getTokenPicker: GetTokenPickerHandler;
  validationErrors?: string[];
  hideValidationErrors?: ChangeHandler;
}

export const SettingTokenField = ({ ...props }: SettingTokenFieldProps) => {
  const labelId = useId('msla-editor-label');
  const renderLabel = props.editor?.toLowerCase() !== 'floatingactionmenu';
  return (
    <>
      {renderLabel && (
        <div className="msla-input-parameter-label">
          <Label id={labelId} className="msla-label" required={props.required}>
            {props.label}
          </Label>
        </div>
      )}
      <TokenField {...props} labelId={labelId} />
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
  isCallback,
  isLoading,
  errorDetails,
  showTokens,
  label,
  labelId,
  pickerCallbacks,
  onValueChange,
  onComboboxMenuOpen,
  hideValidationErrors,
  getTokenPicker,
}: SettingTokenFieldProps & { labelId: string }) => {
  const dropdownOptions = editorOptions?.options?.value ?? editorOptions?.options ?? [];

  switch (editor?.toLowerCase()) {
    case 'copyable':
      return <CopyInputControl placeholder={placeholder} text={value[0].value} />;

    case 'dropdown':
      return (
        <DropdownEditor
          label={label}
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
          labelId={labelId}
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
          labelId={labelId}
          label={label}
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
      return <SchemaEditor label={label} readonly={readOnly} initialValue={value} onChange={onValueChange} />;

    case 'dictionary':
      return (
        <DictionaryEditor
          labelId={labelId}
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
          labelId={labelId}
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
          labelId={labelId}
          type={editorViewModel.complexArray ? ArrayType.COMPLEX : ArrayType.SIMPLE}
          labelProps={{ text: label ? `${label} Item` : 'Array Item' }}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          isTrigger={isTrigger}
          getTokenPicker={getTokenPicker}
          itemSchema={editorViewModel.itemSchema}
          onChange={onValueChange}
        />
      );

    case 'authentication':
      return (
        <AuthenticationEditor
          labelId={labelId}
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
        <SimpleQueryBuilder
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
      return (
        <ScheduleEditor
          readOnly={readOnly}
          type={editorOptions?.recurrenceType}
          showPreview={editorOptions?.showPreview}
          initialValue={value}
          onChange={onValueChange}
        />
      );

    case 'filepicker':
      return (
        <FilePickerEditor
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: showTokens, clearEditor: true }}
          readonly={readOnly}
          initialValue={value}
          displayValue={editorViewModel.displayValue}
          type={editorOptions.pickerType}
          items={editorOptions.items}
          fileFilters={editorOptions.fileFilters}
          pickerCallbacks={pickerCallbacks as PickerCallbackHandlers}
          isLoading={isLoading}
          errorDetails={errorDetails}
          editorBlur={onValueChange}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
        />
      );
    // todo when html editor is ready
    // case 'html':
    //   return (
    //     <HTMLEditor
    //       initialValue={value}
    //       placeholder={placeholder}
    //       BasePlugins={{ tokens: showTokens }}
    //       readonly={readOnly}
    //       getTokenPicker={getTokenPicker}
    //       onChange={onValueChange}
    //     />
    //   );
    case 'floatingactionmenu': {
      return <FloatingActionMenu supportedTypes={editorOptions?.supportedTypes} initialValue={value} onChange={onValueChange} />;
    }

    default:
      return (
        <StringEditor
          labelId={labelId}
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          BasePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          isTrigger={isTrigger}
          showCallbackTokens={isCallback}
          initialValue={value}
          editorBlur={onValueChange}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
        />
      );
  }
};
