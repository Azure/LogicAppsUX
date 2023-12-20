import { ArrayEditor } from '../../arrayeditor';
import { AuthenticationEditor } from '../../authentication';
import { CodeEditor } from '../../code';
import { Combobox } from '../../combobox';
import { CopyInputControl } from '../../copyinputcontrol';
import { DictionaryEditor } from '../../dictionary';
import { DropdownEditor } from '../../dropdown';
import type { ValueSegment } from '../../editor';
import type { CallbackHandler, CastHandler, ChangeHandler, GetTokenPickerHandler } from '../../editor/base';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import { EditorLanguage } from '../../editor/monaco';
import { StringEditor } from '../../editor/string';
import { FloatingActionMenuKind } from '../../floatingactionmenu/constants';
import { FloatingActionMenuInputs } from '../../floatingactionmenu/floatingactionmenuinputs';
import { FloatingActionMenuOutputs } from '../../floatingactionmenu/floatingactionmenuoutputs';
import { HTMLEditor } from '../../html';
import type { PickerCallbackHandlers } from '../../picker/filepickereditor';
import { FilePickerEditor } from '../../picker/filepickereditor';
import { QueryBuilderEditor } from '../../querybuilder';
import { HybridQueryBuilderEditor } from '../../querybuilder/HybridQueryBuilder';
import { SimpleQueryBuilder } from '../../querybuilder/SimpleQueryBuilder';
import { ScheduleEditor } from '../../recurrence';
import { SchemaEditor } from '../../schemaeditor';
import { TableEditor } from '../../table';
import type { TokenGroup } from '../../tokenpicker/models/token';
import { useId } from '../../useId';
import { convertUIElementNameToAutomationId } from '../../utils';
import { CustomTokenField, isCustomEditor } from './customTokenField';
import type { SettingProps } from './settingtoggle';
import { Label } from '@fluentui/react';
import { equals } from '@microsoft/utils-logic-apps';

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
  tokenMapping: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  onValueChange?: ChangeHandler;
  onComboboxMenuOpen?: CallbackHandler;
  onCastParameter: CastHandler;
  pickerCallbacks?: PickerCallbackHandlers;
  tokenpickerButtonProps?: TokenPickerButtonEditorProps;
  getTokenPicker: GetTokenPickerHandler;
  validationErrors?: string[];
  hideValidationErrors?: ChangeHandler;
  suppressCastingForSerialize?: boolean;
}

export const SettingTokenField = ({ ...props }: SettingTokenFieldProps) => {
  const labelId = useId('msla-editor-label');
  const hideLabel =
    (isCustomEditor(props) && props.editorOptions?.hideLabel === true) || equals(props.editor?.toLowerCase(), 'floatingactionmenu');
  return (
    <>
      {!hideLabel && (
        <div className="msla-input-parameter-label">
          <Label id={labelId} className="msla-label" required={props.required}>
            {props.label}
          </Label>
        </div>
      )}
      <div key={props.id}>
        {isCustomEditor(props) ? <CustomTokenField {...props} labelId={labelId} /> : <TokenField {...props} labelId={labelId} />}
      </div>
    </>
  );
};

export type TokenFieldProps = SettingTokenFieldProps & { labelId: string };

export const TokenField = ({
  editor,
  editorOptions,
  editorViewModel,
  placeholder,
  readOnly,
  value,
  isLoading,
  errorDetails,
  showTokens,
  label,
  labelId,
  pickerCallbacks,
  tokenpickerButtonProps,
  tokenMapping,
  loadParameterValueFromString,
  onValueChange,
  onComboboxMenuOpen,
  hideValidationErrors,
  onCastParameter,
  getTokenPicker,
  suppressCastingForSerialize,
}: TokenFieldProps) => {
  const dropdownOptions = editorOptions?.options?.value ?? editorOptions?.options ?? [];
  const labelForAutomationId = convertUIElementNameToAutomationId(label);

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
          dataAutomationId={`msla-setting-token-editor-dropdowneditor-${labelForAutomationId}`}
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
          isLoading={isLoading}
          errorDetails={errorDetails}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          onMenuOpen={onComboboxMenuOpen}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
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
          valueType={editorOptions?.valueType}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-dictionaryeditor-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
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
          columns={editorOptions?.columns?.count}
          titles={editorOptions?.columns?.titles}
          keys={editorOptions?.columns?.keys}
          types={editorOptions?.columns?.types}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-tableditor-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
        />
      );

    case 'array':
      return (
        <ArrayEditor
          labelId={labelId}
          arrayType={editorViewModel.arrayType}
          labelProps={{ text: label ? `${label} Item` : 'Array Item' }}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={editorViewModel.uncastedValue}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          itemSchema={editorViewModel.itemSchema}
          castParameter={onCastParameter}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-arrayeditor-${labelForAutomationId}`}
          // Props for dynamic options
          options={(editorOptions?.options?.value ?? editorOptions?.options)?.map((option: any, index: number) => ({
            key: index.toString(),
            ...option,
          }))}
          isLoading={isLoading}
          errorDetails={errorDetails}
          onMenuOpen={onComboboxMenuOpen}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          suppressCastingForSerialize={suppressCastingForSerialize}
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
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          basePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          tokenPickerButtonProps={tokenpickerButtonProps}
        />
      );

    case 'condition':
      return editorViewModel.isOldFormat ? (
        <SimpleQueryBuilder
          readonly={readOnly}
          itemValue={editorViewModel.itemValue ?? value}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
        />
      ) : editorViewModel.isHybridEditor ? (
        <HybridQueryBuilderEditor
          readonly={readOnly}
          groupProps={JSON.parse(JSON.stringify(editorViewModel.items))}
          onChange={onValueChange}
          getTokenPicker={getTokenPicker}
        />
      ) : (
        <QueryBuilderEditor
          readonly={readOnly}
          groupProps={JSON.parse(JSON.stringify(editorViewModel.items))}
          onChange={onValueChange}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          getTokenPicker={getTokenPicker}
          showDescription={true}
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
          basePlugins={{ tokens: showTokens, clearEditor: true }}
          readonly={readOnly}
          initialValue={value}
          displayValue={editorViewModel.displayValue}
          type={editorOptions.pickerType}
          items={editorOptions.items}
          fileFilters={editorOptions.fileFilters}
          pickerCallbacks={pickerCallbacks as PickerCallbackHandlers}
          isLoading={isLoading}
          errorDetails={errorDetails}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          editorBlur={onValueChange}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
          dataAutomationId={`msla-setting-token-editor-filepickereditor-${labelForAutomationId}`}
        />
      );
    case 'html':
      return (
        <HTMLEditor
          initialValue={value}
          placeholder={placeholder}
          basePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          tokenPickerButtonProps={tokenpickerButtonProps}
          loadParameterValueFromString={loadParameterValueFromString}
          tokenMapping={tokenMapping}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-htmleditor-${labelForAutomationId}`}
        />
      );
    case 'floatingactionmenu': {
      return editorOptions?.menuKind === FloatingActionMenuKind.outputs ? (
        <FloatingActionMenuOutputs
          supportedTypes={editorOptions?.supportedTypes}
          initialValue={value}
          onChange={onValueChange}
          editorViewModel={editorViewModel}
          basePlugins={{ tokens: showTokens }}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          hideValidationErrors={hideValidationErrors}
        />
      ) : (
        <FloatingActionMenuInputs
          supportedTypes={editorOptions?.supportedTypes}
          useStaticInputs={editorOptions?.useStaticInputs}
          initialValue={value}
          isRequestApiConnectionTrigger={editorOptions?.isRequestApiConnectionTrigger}
          onChange={onValueChange}
        />
      );
    }

    default:
      return (
        <StringEditor
          labelId={labelId}
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          basePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          initialValue={value}
          tokenPickerButtonProps={tokenpickerButtonProps}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          editorBlur={onValueChange}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
          dataAutomationId={`msla-setting-token-editor-stringeditor-${labelForAutomationId}`}
        />
      );
  }
};
