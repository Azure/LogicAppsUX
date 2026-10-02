import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Dropdown,
  Field,
  FluentProvider,
  Input,
  Option,
  Radio,
  RadioGroup,
  Textarea,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { AssemblyClassInfo } from '../../../src/protocol/mapEditorProtocol';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

export type ScriptingConfigType =
  | 'inlineCSharp'
  | 'inlineVbNet'
  | 'inlineJScript'
  | 'inlineXslt'
  | 'inlineXsltCallTemplate'
  | 'externalAssembly';

export interface ScriptingFunctoidSummary {
  name: string;
  meta: string;
  description: string;
  expectedInputs: string;
  inputs: string[];
  outputs: string[];
  hasOutput: boolean;
}

export interface ScriptingConfigViewModel {
  summary: ScriptingFunctoidSummary;
  scriptType: ScriptingConfigType;
  scriptBody: string;
  assemblyReferences: string;
  assemblyPath: string;
  className: string;
  methodName: string;
  assemblyClasses: AssemblyClassInfo[];
}

export interface ScriptingConfigResult {
  scriptType: ScriptingConfigType;
  scriptBody: string;
  assemblyReferences: string;
  assemblyPath: string;
  className: string;
  methodName: string;
}

export interface ScriptingAssemblyUpdate {
  assemblyPath: string;
  assemblyClasses: AssemblyClassInfo[];
  className: string;
  methodName: string;
}

export interface ScriptingConfigCallbacks {
  onSave(result: ScriptingConfigResult): void;
  onCancel(): void;
  onBrowseAssembly(): void;
}

const scriptTypeOptions: { value: ScriptingConfigType; label: string }[] = [
  { value: 'inlineCSharp', label: 'Inline C#' },
  { value: 'inlineVbNet', label: 'Inline VB.NET' },
  { value: 'inlineJScript', label: 'Inline JScript' },
  { value: 'inlineXslt', label: 'Inline XSLT' },
  { value: 'inlineXsltCallTemplate', label: 'Inline XSLT Call Template' },
  { value: 'externalAssembly', label: 'External Assembly' },
];

function supportsAssemblyReferences(scriptType: ScriptingConfigType): boolean {
  return scriptType === 'inlineCSharp' || scriptType === 'inlineVbNet' || scriptType === 'inlineJScript';
}

const useStyles = makeStyles({
  surface: { width: '640px', maxWidth: '92vw' },
  meta: {
    marginTop: '2px',
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  summary: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  summaryGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacingHorizontalL },
  heading: { fontWeight: tokens.fontWeightSemibold },
  requirement: { color: tokens.colorNeutralForeground3 },
  description: { color: tokens.colorNeutralForeground2, lineHeight: tokens.lineHeightBase300 },
  list: { margin: 0, paddingLeft: tokens.spacingHorizontalL, color: tokens.colorNeutralForeground2 },
  empty: { color: tokens.colorNeutralForeground3 },
  sections: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, paddingTop: tokens.spacingVerticalM },
  codeArea: { fontFamily: tokens.fontFamilyMonospace },
  browseRow: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'end' },
  browsePath: { flex: 1 },
});

interface ScriptingConfigDialogViewProps extends ScriptingConfigCallbacks {
  model: ScriptingConfigViewModel;
  assemblyUpdate: ScriptingAssemblyUpdate | null;
  assemblyVersion: number;
}

function ScriptingConfigDialogView({
  model,
  assemblyUpdate,
  assemblyVersion,
  onSave,
  onCancel,
  onBrowseAssembly,
}: ScriptingConfigDialogViewProps): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  const { summary } = model;
  const [scriptType, setScriptType] = useState<ScriptingConfigType>(model.scriptType);
  const [scriptBody, setScriptBody] = useState(model.scriptBody);
  const [assemblyReferences, setAssemblyReferences] = useState(model.assemblyReferences);
  const [assemblyPath, setAssemblyPath] = useState(model.assemblyPath);
  const [assemblyClasses, setAssemblyClasses] = useState<AssemblyClassInfo[]>(model.assemblyClasses);
  const [className, setClassName] = useState(model.className);
  const [methodName, setMethodName] = useState(model.methodName);

  // Apply the result of an async "Browse assembly" round-trip pushed from the host.
  useEffect(() => {
    if (!assemblyUpdate) {
      return;
    }
    setAssemblyPath(assemblyUpdate.assemblyPath);
    setAssemblyClasses(assemblyUpdate.assemblyClasses);
    setClassName(assemblyUpdate.className);
    setMethodName(assemblyUpdate.methodName);
  }, [assemblyVersion, assemblyUpdate]);

  const isExternal = scriptType === 'externalAssembly';
  const classNames = assemblyClasses.length > 0 ? assemblyClasses.map((item) => item.className) : className ? [className] : [];
  const methods = assemblyClasses.find((item) => item.className === className)?.methods ?? [];
  const selectedMethod = methods.find((method) => method.name === methodName);

  const handleClassChange = (nextClassName: string): void => {
    setClassName(nextClassName);
    const nextMethods = assemblyClasses.find((item) => item.className === nextClassName)?.methods ?? [];
    setMethodName(nextMethods[0]?.name ?? '');
  };

  const handleSave = (): void => {
    onSave({ scriptType, scriptBody, assemblyReferences, assemblyPath, className, methodName });
  };

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <Dialog
        open
        modalType="modal"
        onOpenChange={(_event, data) => {
          if (!data.open) {
            onCancel();
          }
        }}
      >
        <DialogSurface className={`${styles.surface} ${typographyStyles.base}`}>
          <DialogBody>
            <DialogTitle>
              Scripting Functoid Properties
              <div className={styles.meta}>{summary.meta}</div>
            </DialogTitle>
            <DialogContent>
              <div className={styles.summary}>
                <div className={styles.heading}>Functionality</div>
                <div className={styles.description}>{summary.description}</div>
                <div className={styles.summaryGrid}>
                  <div>
                    <div className={styles.heading}>Inputs</div>
                    <div className={styles.requirement}>
                      Expected: {summary.expectedInputs}; configured: {summary.inputs.length}
                    </div>
                    {summary.inputs.length > 0 ? (
                      <ul className={styles.list}>
                        {summary.inputs.map((input, index) => (
                          <li key={index}>{input}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className={styles.empty}>No inputs connected</div>
                    )}
                  </div>
                  <div>
                    <div className={styles.heading}>Output</div>
                    <div className={styles.requirement}>
                      {summary.hasOutput
                        ? `${summary.outputs.length} connection${summary.outputs.length === 1 ? '' : 's'}`
                        : 'This functoid has no output.'}
                    </div>
                    {summary.outputs.length > 0 ? (
                      <ul className={styles.list}>
                        {summary.outputs.map((output, index) => (
                          <li key={index}>{output}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className={styles.empty}>Output is not connected</div>
                    )}
                  </div>
                </div>
              </div>
              <Divider />
              <div className={styles.sections}>
                <Field label="Script Type">
                  <RadioGroup
                    layout="horizontal-stacked"
                    value={scriptType}
                    onChange={(_event, data) => setScriptType(data.value as ScriptingConfigType)}
                  >
                    {scriptTypeOptions.map((option) => (
                      <Radio key={option.value} value={option.value} label={option.label} />
                    ))}
                  </RadioGroup>
                </Field>
                {!isExternal && (
                  <Field label="Script">
                    <Textarea
                      className={styles.codeArea}
                      value={scriptBody}
                      spellCheck={false}
                      resize="vertical"
                      rows={8}
                      onChange={(_event, data) => setScriptBody(data.value)}
                    />
                  </Field>
                )}
                {supportsAssemblyReferences(scriptType) && (
                  <Field label="Assembly References" hint="One assembly name or DLL path per line">
                    <Textarea
                      className={styles.codeArea}
                      value={assemblyReferences}
                      spellCheck={false}
                      resize="vertical"
                      rows={3}
                      onChange={(_event, data) => setAssemblyReferences(data.value)}
                    />
                  </Field>
                )}
                {isExternal && (
                  <>
                    <Field label="Assembly Path">
                      <div className={styles.browseRow}>
                        <Input className={styles.browsePath} readOnly value={assemblyPath} placeholder="Browse to a .NET assembly (DLL)" />
                        <Button onClick={onBrowseAssembly}>Browse...</Button>
                      </div>
                    </Field>
                    <Field
                      label="Class Name"
                      hint={
                        assemblyClasses.length > 0
                          ? `${assemblyClasses.length} class${assemblyClasses.length === 1 ? '' : 'es'} found in assembly`
                          : 'Browse a .NET DLL to load available classes.'
                      }
                    >
                      <Dropdown
                        value={className}
                        selectedOptions={className ? [className] : []}
                        placeholder="-- Browse a DLL to load classes --"
                        disabled={classNames.length === 0}
                        onOptionSelect={(_event, data) => handleClassChange(data.optionValue ?? '')}
                      >
                        {classNames.map((name) => (
                          <Option key={name} value={name}>
                            {name}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                    <Field
                      label="Method Name"
                      hint={methods.length > 0 ? `${methods.length} method${methods.length === 1 ? '' : 's'} available` : undefined}
                    >
                      <Dropdown
                        value={selectedMethod ? `${selectedMethod.signature} : ${selectedMethod.returnType}` : methodName}
                        selectedOptions={methodName ? [methodName] : []}
                        placeholder="-- Select a class first --"
                        disabled={methods.length === 0}
                        onOptionSelect={(_event, data) => setMethodName(data.optionValue ?? '')}
                      >
                        {methods.map((method) => (
                          <Option key={method.name} value={method.name} text={`${method.signature} : ${method.returnType}`}>
                            {method.signature} : {method.returnType}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  </>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleSave}>
                Save
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}

export class ScriptingConfigDialog extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: ScriptingConfigViewModel | null = null;
  private callbacks: ScriptingConfigCallbacks | null = null;
  private assemblyUpdate: ScriptingAssemblyUpdate | null = null;
  private assemblyVersion = 0;
  private renderVersion = 0;

  public configure(model: ScriptingConfigViewModel, callbacks: ScriptingConfigCallbacks): void {
    this.model = model;
    this.callbacks = callbacks;
    this.renderVersion++;
    this.renderReact();
  }

  public applyAssemblyResult(update: ScriptingAssemblyUpdate): void {
    this.assemblyUpdate = update;
    this.assemblyVersion++;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.renderReact();
  }

  public disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  private renderReact(): void {
    if (!this.isConnected || !this.model || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(
      <ScriptingConfigDialogView
        key={this.renderVersion}
        model={this.model}
        assemblyUpdate={this.assemblyUpdate}
        assemblyVersion={this.assemblyVersion}
        onSave={this.callbacks.onSave}
        onCancel={this.callbacks.onCancel}
        onBrowseAssembly={this.callbacks.onBrowseAssembly}
      />
    );
  }
}

customElements.define('biztalk-scripting-config-dialog', ScriptingConfigDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-scripting-config-dialog': ScriptingConfigDialog;
  }
}
