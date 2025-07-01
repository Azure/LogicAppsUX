import { cloneElement, useMemo, useState } from 'react';
import { EditorLanguage, equals, getPropertyValue, replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import type { TokenGroup } from '@microsoft/logic-apps-shared';
import { AgentInstructionEditor } from '../../agentinstruction';
import { ArrayEditor } from '../../arrayeditor';
import { AuthenticationEditor } from '../../authentication';
import { CodeEditor } from '../../code';
import type { FileNameChangeHandler } from '../../code';
import { isCustomCode } from '../../code/util';
import { Combobox } from '../../combobox';
import constants from '../../constants';
import { CopyInputControl } from '../../copyinputcontrol';
import { DictionaryEditor } from '../../dictionary';
import { DropdownEditor } from '../../dropdown';
import type { ValueSegment } from '../../editor';
import type {
  CallbackHandler,
  CastHandler,
  ChangeHandler,
  GetTokenPickerHandler,
  loadParameterValueFromStringHandler,
} from '../../editor/base';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import type { AgentParameterButtonProps } from '../../editor/base/plugins/tokenpickerbutton/agentParameterButton';
import { createLiteralValueSegment, getDropdownOptionsFromOptions } from '../../editor/base/utils/helper';
import { InitializeVariableEditor } from '../../editor/initializevariable';
import { StringEditor } from '../../editor/string';
import { FloatingActionMenuKind } from '../../floatingactionmenu/constants';
import { FloatingActionMenuInputs } from '../../floatingactionmenu/floatingactionmenuinputs';
import { FloatingActionMenuOutputs } from '../../floatingactionmenu/floatingactionmenuoutputs';
import { HTMLEditor } from '../../html';
import { Label } from '../../label';
import { MixedInputEditor } from '../../mixedinputeditor/mixedinputeditor';
import type { PickerCallbackHandlers } from '../../picker/filepickerEditor';
import { FilePickerEditor } from '../../picker/filepickerEditor';
import { QueryBuilderEditor } from '../../querybuilder';
import { HybridQueryBuilderEditor } from '../../querybuilder/HybridQueryBuilder';
import { SimpleQueryBuilder } from '../../querybuilder/SimpleQueryBuilder';
import { ScheduleEditor } from '../../recurrence';
import { SchemaEditor } from '../../schemaeditor';
import type { SettingProps } from './';
import { CustomTokenField, isCustomEditor } from './customTokenField';
import { TableEditor } from '../../table';
import { useId } from '../../useId';
import { useSettingTokenStyles } from './styles';
import { Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
interface EditorHostOptions {
  suppressCastingForSerialize?: boolean;
  isMultiVariableEnabled?: boolean;
}

export interface NewResourceProps {
  component: React.FunctionComponent<any>;
  hideLabel?: boolean;
  editor?: string;
  onClose: (name?: string) => void;
  metadata?: Record<string, any>;
}

export interface SettingTokenFieldProps extends SettingProps {
  id?: string;
  value: ValueSegment[];
  isDynamic?: boolean;
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
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  onValueChange?: ChangeHandler;
  onComboboxMenuOpen?: CallbackHandler;
  onCastParameter: CastHandler;
  onFileNameChange?: FileNameChangeHandler;
  pickerCallbacks?: PickerCallbackHandlers;
  agentParameterButtonProps?: Partial<AgentParameterButtonProps>;
  tokenpickerButtonProps?: TokenPickerButtonEditorProps;
  getTokenPicker: GetTokenPickerHandler;
  validationErrors?: string[];
  hideValidationErrors?: ChangeHandler;
  hostOptions?: EditorHostOptions;
  subComponent?: JSX.Element | null;
  subMenu?: JSX.Element | null;
  hideTokenPicker?: boolean;
  newResourceProps?: NewResourceProps;
}

export const SettingTokenField = ({ ...props }: SettingTokenFieldProps) => {
  const normalizedLabel = props.label?.replace(/ /g, '-');
  const styles = useSettingTokenStyles();
  const intl = useIntl();
  const labelId = useId(normalizedLabel);
  const [openPopover, setOpenPopover] = useState(false);
  const hideLabel =
    (isCustomEditor(props) && props.editorOptions?.hideLabel === true) ||
    equals(props.editor?.toLowerCase(), constants.PARAMETER.EDITOR.FLOATINGACTIONMENU);
  const [showSubComponent, setShowSubComponent] = useState(false);
  const CustomNewResourceComponent = useMemo(() => props.newResourceProps?.component, [props.newResourceProps?.component]);
  const stringResources = useMemo(
    () => ({
      CREATE_NEW: intl.formatMessage({
        defaultMessage: 'Create New',
        id: '+nh6WG',
        description: 'Label for creating a new resource in the token field.',
      }),
    }),
    [intl]
  );

  return (
    <>
      {!hideLabel && (
        <div className="msla-input-parameter-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Label id={labelId} isRequiredField={props.required} text={props.label} />
          {props.subMenu && cloneElement(props.subMenu, { setShowSubComponent })}
        </div>
      )}
      <div key={props.id}>
        {isCustomEditor(props) ? <CustomTokenField {...props} labelId={labelId} /> : <TokenField {...props} labelId={labelId} />}
      </div>
      {props.newResourceProps || props.subComponent ? (
        <div className={styles.subComponentContainer}>
          {props.subComponent ? (
            <div className="msla-input-parameter-subcomponent">
              {cloneElement(props.subComponent, {
                showSubComponent,
                setShowSubComponent,
              })}
            </div>
          ) : null}
          {props.newResourceProps ? (
            <Popover
              trapFocus={true}
              inline={true}
              positioning={'below-start'}
              withArrow={true}
              open={openPopover}
              onOpenChange={(_e, data) => setOpenPopover(data.open ?? false)}
            >
              <PopoverTrigger>
                <div className={styles.newResourceContainer} onClick={() => setOpenPopover(!open)}>
                  {stringResources.CREATE_NEW}
                </div>
              </PopoverTrigger>
              <PopoverSurface tabIndex={-1}>
                {CustomNewResourceComponent ? (
                  <CustomNewResourceComponent
                    values={[props.editorOptions]}
                    onClose={(name?: string) => {
                      setOpenPopover(false);
                      props.newResourceProps?.onClose?.(name);
                    }}
                    metadata={props.newResourceProps?.metadata}
                  />
                ) : null}
              </PopoverSurface>
            </Popover>
          ) : null}
        </div>
      ) : null}
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
  isDynamic,
  isLoading,
  errorDetails,
  showTokens,
  label,
  labelId,
  pickerCallbacks,
  agentParameterButtonProps,
  tokenpickerButtonProps,
  tokenMapping,
  loadParameterValueFromString,
  onValueChange,
  onComboboxMenuOpen,
  onFileNameChange,
  hideValidationErrors,
  onCastParameter,
  getTokenPicker,
  hostOptions,
  required,
  hideTokenPicker,
}: TokenFieldProps) => {
  const dropdownOptions = useMemo(() => getDropdownOptionsFromOptions(editorOptions), [editorOptions]);
  const labelForAutomationId = useMemo(() => replaceWhiteSpaceWithUnderscore(label), [label]);

  switch (editor?.toLowerCase()) {
    case constants.PARAMETER.EDITOR.AGENT_INSTRUCTION:
      return (
        <AgentInstructionEditor
          labelId={labelId}
          className="msla-setting-token-editor-container"
          placeholder={placeholder}
          basePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          initialValue={value}
          tokenPickerButtonProps={tokenpickerButtonProps}
          agentParameterButtonProps={agentParameterButtonProps}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          serializeValue={onValueChange}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
          onCastParameter={onCastParameter}
          dataAutomationId={`msla-setting-token-editor-agent-instruction-${labelForAutomationId}`}
        />
      );

    case constants.PARAMETER.EDITOR.ARRAY:
      return (
        <ArrayEditor
          isRequired={required}
          labelId={labelId}
          arrayType={editorViewModel.arrayType}
          initialMode={editorOptions?.initialMode}
          label={label}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={editorViewModel.uncastedValue}
          agentParameterButtonProps={agentParameterButtonProps}
          tokenPickerButtonProps={tokenpickerButtonProps}
          getTokenPicker={getTokenPicker}
          basePlugins={{ tokens: showTokens }}
          itemSchema={editorViewModel.itemSchema}
          castParameter={onCastParameter}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-arrayeditor-${labelForAutomationId}`}
          // Props for dynamic options
          isDynamic={isDynamic}
          options={dropdownOptions}
          isLoading={isLoading}
          errorDetails={errorDetails}
          onMenuOpen={onComboboxMenuOpen}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          suppressCastingForSerialize={hostOptions?.suppressCastingForSerialize}
        />
      );

    case constants.PARAMETER.EDITOR.AUTHENTICATION:
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
          agentParameterButtonProps={agentParameterButtonProps}
        />
      );

    case constants.PARAMETER.EDITOR.CODE: {
      const { language = EditorLanguage.javascript } = editorOptions || {};
      const customCodeEditor = isCustomCode(editor, language);
      const customCodeData = (() => {
        const data = editorViewModel?.customCodeData?.fileData ?? '';
        return typeof data === 'string' ? data : JSON.stringify(data);
      })();
      const fileName = editorViewModel?.customCodeData?.fileName;

      const initialValue = customCodeEditor ? [createLiteralValueSegment(customCodeData)] : value;

      return (
        <CodeEditor
          originalFileName={fileName}
          labelId={labelId}
          initialValue={initialValue}
          getTokenPicker={getTokenPicker}
          onFileNameChange={onFileNameChange}
          language={language}
          onChange={onValueChange}
          readonly={readOnly}
          placeholder={placeholder}
          customCodeEditor={customCodeEditor}
          hideTokenPicker={hideTokenPicker}
        />
      );
    }

    case constants.PARAMETER.EDITOR.COMBOBOX:
      return (
        <Combobox
          labelId={labelId}
          label={label}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          options={dropdownOptions}
          useOption={true}
          isLoading={isLoading}
          errorDetails={errorDetails}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          onMenuOpen={onComboboxMenuOpen}
          multiSelect={getPropertyValue(editorOptions, 'multiSelect')}
          serialization={editorOptions?.serialization}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          agentParameterButtonProps={agentParameterButtonProps}
        />
      );

    case constants.PARAMETER.EDITOR.COPYABLE:
      return <CopyInputControl placeholder={placeholder} text={value[0].value} />;

    case constants.PARAMETER.EDITOR.CONDITION:
      return editorOptions?.isOldFormat ? (
        <SimpleQueryBuilder
          readonly={readOnly}
          itemValue={editorViewModel?.itemValue}
          rowFormat={editorViewModel?.isRowFormat}
          initialValue={value}
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
    case constants.PARAMETER.EDITOR.DICTIONARY:
      return (
        <DictionaryEditor
          labelId={labelId}
          label={label}
          placeholder={placeholder}
          readonly={readOnly}
          initialValue={value}
          initialItems={editorViewModel.items}
          valueType={editorOptions?.valueType}
          tokenPickerButtonProps={tokenpickerButtonProps}
          agentParameterButtonProps={agentParameterButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-dictionaryeditor-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
        />
      );

    case constants.PARAMETER.EDITOR.DROPDOWN:
      return (
        <DropdownEditor
          label={label}
          readonly={readOnly}
          initialValue={value}
          options={dropdownOptions.map((option: any, index: number) => ({
            key: index.toString(),
            ...option,
          }))}
          placeholder={placeholder}
          multiSelect={!!getPropertyValue(editorOptions, 'multiSelect')}
          serialization={editorOptions?.serialization}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-dropdowneditor-${labelForAutomationId}`}
        />
      );

    case constants.PARAMETER.EDITOR.FLOATINGACTIONMENU: {
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
          includeOutputDescription={editorOptions?.includeOutputDescription}
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

    case constants.PARAMETER.EDITOR.FILEPICKER:
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
          agentParameterButtonProps={agentParameterButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={hideValidationErrors}
          dataAutomationId={`msla-setting-token-editor-filepickereditor-${labelForAutomationId}`}
        />
      );

    case constants.PARAMETER.EDITOR.HTML:
      return (
        <HTMLEditor
          labelId={labelId}
          initialValue={value}
          placeholder={placeholder}
          basePlugins={{ tokens: showTokens }}
          readonly={readOnly}
          tokenPickerButtonProps={tokenpickerButtonProps}
          agentParameterButtonProps={agentParameterButtonProps}
          loadParameterValueFromString={loadParameterValueFromString}
          tokenMapping={tokenMapping}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-htmleditor-${labelForAutomationId}`}
        />
      );

    case constants.PARAMETER.EDITOR.INITIALIZE_VARIABLE:
      return (
        <InitializeVariableEditor
          initialValue={value}
          getTokenPicker={getTokenPicker}
          onChange={(updatedChangeState) => {
            onValueChange?.(updatedChangeState);
            hideValidationErrors?.(updatedChangeState);
          }}
          validationErrors={editorViewModel.validationErrors}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
          readonly={readOnly}
          isAgentParameter={editorOptions?.isAgentParameter}
          tokenPickerButtonProps={tokenpickerButtonProps}
          agentParameterButtonProps={agentParameterButtonProps}
          dataAutomationId={`msla-setting-token-editor-initializevariableeditor-${labelForAutomationId}`}
          isMultiVariableEnabled={hostOptions?.isMultiVariableEnabled}
        />
      );

    case constants.PARAMETER.EDITOR.RECURRENCE:
      return (
        <ScheduleEditor
          readOnly={readOnly}
          type={editorOptions?.recurrenceType}
          showPreview={editorOptions?.showPreview}
          initialValue={value}
          onChange={onValueChange}
        />
      );

    case constants.PARAMETER.EDITOR.SCHEMA:
      return <SchemaEditor label={label} readonly={readOnly} initialValue={value} onChange={onValueChange} />;

    case constants.PARAMETER.EDITOR.TABLE:
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
          agentParameterButtonProps={agentParameterButtonProps}
          getTokenPicker={getTokenPicker}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-tableditor-${labelForAutomationId}`}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
        />
      );

    case constants.PARAMETER.EDITOR.MIXEDINPUTEDITOR: {
      return (
        <MixedInputEditor
          supportedTypes={editorOptions?.supportedTypes}
          useStaticInputs={editorOptions?.useStaticInputs}
          initialValue={value}
          isRequestApiConnectionTrigger={editorOptions?.isRequestApiConnectionTrigger}
          onChange={onValueChange ?? (() => {})}
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
          agentParameterButtonProps={agentParameterButtonProps}
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
