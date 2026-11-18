import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Tab,
  TabList,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowDownRegular, ArrowUpRegular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { type MapDocument, type MapOptions, ScriptType, type ScriptTypePreference } from '../../../src/model/mapModel';
import { VsCodeFluentProvider as FluentProvider, useTypographyStyles } from '../fluentTheme';

type GridOptions = MapOptions;

export interface GridPropertiesResult {
  options: GridOptions;
  customXsltPath?: string;
  customExtensionXmlPath?: string;
  scriptTypePrecedence?: ScriptTypePreference[];
}

interface GridPropertiesCallbacks {
  onSave(result: GridPropertiesResult): void;
  onCancel(): void;
}

const scriptLabels: Record<ScriptType, string> = {
  [ScriptType.Inline]: 'Inline Script',
  [ScriptType.ExternalAssembly]: 'External Assembly',
  [ScriptType.InlineCSharp]: 'Inline C#',
  [ScriptType.InlineVbNet]: 'Inline VB.NET',
  [ScriptType.InlineJScript]: 'Inline JScript.NET',
  [ScriptType.InlineXslt]: 'Inline XSLT',
  [ScriptType.InlineXsltCallTemplate]: 'Inline XSLT Call Template',
};

const defaultPrecedence: ScriptTypePreference[] = [
  ScriptType.InlineCSharp,
  ScriptType.ExternalAssembly,
  ScriptType.InlineVbNet,
  ScriptType.InlineJScript,
  ScriptType.InlineXsltCallTemplate,
  ScriptType.InlineXslt,
].map((type) => ({ type, enabled: true }));

const useStyles = makeStyles({
  surface: {
    width: '760px',
    height: '688px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100dvh - 32px)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  body: { flex: 1, minHeight: 0, minWidth: 0, gridTemplateRows: 'auto minmax(0, 1fr) auto' },
  content: {
    minHeight: 0,
    minWidth: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  tabs: { flexShrink: 0, flexWrap: 'wrap' },
  tab: {
    color: tokens.colorNeutralForeground1,
    '&:first-of-type': { paddingLeft: 0 },
    '&:first-of-type::before, &:first-of-type::after': { left: 0 },
    '&[aria-selected="true"]': {
      color: 'var(--vscode-textLink-foreground, var(--vscode-foreground))',
    },
  },
  tabContent: { color: 'inherit' },
  actions: { paddingTop: tokens.spacingVerticalL },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  list: { listStyleType: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  script: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 32px 32px',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
  },
  scriptLabel: { flex: 1, minWidth: 0, overflowWrap: 'anywhere' },
  field: {
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: 'minmax(120px, 190px) minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalL,
    alignItems: 'center',
    '& > label': { margin: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
    '@media (max-width: 480px)': {
      gridTemplateColumns: 'minmax(90px, 38%) minmax(0, 1fr)',
      columnGap: tokens.spacingHorizontalS,
    },
  },
  settingLabel: { alignSelf: 'start', paddingTop: '6px' },
  control: {
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: tokens.borderRadiusMedium,
    color: 'var(--vscode-input-foreground, var(--vscode-foreground))',
    backgroundColor: 'var(--vscode-input-background, var(--vscode-editor-background))',
    border: '1px solid var(--vscode-input-border, var(--vscode-contrastBorder, var(--colorNeutralStrokeAccessible)))',
    '&:focus-within': { outline: '1px solid var(--vscode-focusBorder)', outlineOffset: '-1px' },
    '& input, & select': { color: 'inherit', backgroundColor: 'transparent' },
    '& option': {
      color: 'var(--vscode-input-foreground, var(--vscode-foreground))',
      backgroundColor: 'var(--vscode-input-background, var(--vscode-editor-background))',
    },
  },
});

function GridPropertiesDialogView({ model, onSave, onCancel }: { model: MapDocument } & GridPropertiesCallbacks): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  const [category, setCategory] = useState('General');
  const [options, setOptions] = useState<GridOptions>(() => ({ ...model.options }));
  const [customXsltPath, setCustomXsltPath] = useState(model.customXsltPath);
  const [customExtensionXmlPath, setCustomExtensionXmlPath] = useState(model.customExtensionXmlPath);
  const [precedence, setPrecedence] = useState(model.scriptTypePrecedence);
  const scripts = precedence ?? defaultPrecedence;
  const encodings = ['', 'UTF-8', 'UTF-16', 'UTF-16LE', 'UTF-16BE', 'US-ASCII', 'ISO-8859-1'];
  const [customEncoding, setCustomEncoding] = useState(
    !encodings.some((encoding) => encoding.toLowerCase() === options.xsltEncoding.toLowerCase())
  );
  const updateOption = <Key extends keyof GridOptions>(key: Key, value: GridOptions[Key]): void => {
    setOptions((current) => ({ ...current, [key]: value }));
  };
  const textField = (label: string, key: 'doctypePublic' | 'doctypeSystem' | 'cdataSectionElements' | 'mediaType'): React.ReactElement => (
    <Field label={label} className={styles.field} orientation="horizontal">
      <Input
        className={styles.control}
        value={options[key] ?? ''}
        onChange={(_event, data) => updateOption(key, data.value || undefined)}
      />
    </Field>
  );
  const moveScript = (index: number, direction: number): void => {
    const reordered = scripts.map((script) => ({ ...script }));
    const destination = index + direction;
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setPrecedence(reordered);
  };

  return (
    <FluentProvider style={{ display: 'contents' }}>
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
          <DialogBody className={styles.body}>
            <DialogTitle>Grid Properties</DialogTitle>
            <DialogContent className={styles.content}>
              <TabList
                className={styles.tabs}
                selectedValue={category}
                onTabSelect={(_event, data) => setCategory(String(data.value))}
                aria-label="Property categories"
              >
                {['General', 'Custom Header', 'Compiler'].map((name) => (
                  <Tab
                    key={name}
                    className={styles.tab}
                    content={{ className: styles.tabContent }}
                    id={`grid-tab-${name.replaceAll(' ', '-')}`}
                    value={name}
                    aria-controls="grid-properties-panel"
                  >
                    {name}
                  </Tab>
                ))}
              </TabList>
              <div
                className={styles.panel}
                id="grid-properties-panel"
                role="tabpanel"
                aria-labelledby={`grid-tab-${category.replaceAll(' ', '-')}`}
              >
                {category === 'General' && (
                  <>
                    <Field label="Ignore Namespaces for Links" className={styles.field} orientation="horizontal">
                      <Checkbox
                        checked={options.ignoreNamespacesForLinks}
                        onChange={(_event, data) => updateOption('ignoreNamespacesForLinks', data.checked === true)}
                      />
                    </Field>
                    <div className={styles.field}>
                      <div id="grid-script-precedence-label" className={styles.settingLabel}>
                        Script Type Precedence
                      </div>
                      <ol className={styles.list} aria-labelledby="grid-script-precedence-label">
                        {scripts.map((script, index) => (
                          <li className={styles.script} key={script.type}>
                            <Checkbox
                              className={styles.scriptLabel}
                              label={scriptLabels[script.type] ?? script.type}
                              checked={script.enabled}
                              onChange={(_event, data) =>
                                setPrecedence(
                                  scripts.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, enabled: data.checked === true } : { ...entry }
                                  )
                                )
                              }
                            />
                            <Tooltip content="Move up" relationship="label">
                              <Button
                                icon={<ArrowUpRegular />}
                                aria-label={`Move ${scriptLabels[script.type] ?? script.type} up`}
                                disabled={index === 0}
                                onClick={() => moveScript(index, -1)}
                              />
                            </Tooltip>
                            <Tooltip content="Move down" relationship="label">
                              <Button
                                icon={<ArrowDownRegular />}
                                aria-label={`Move ${scriptLabels[script.type] ?? script.type} down`}
                                disabled={index === scripts.length - 1}
                                onClick={() => moveScript(index, 1)}
                              />
                            </Tooltip>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <Field label="Source Schema" className={styles.field} orientation="horizontal">
                      <Input
                        className={styles.control}
                        readOnly
                        value={model.sourceSchema.inlineSchemaXml ? '- Inline Schema -' : model.sourceSchema.location}
                        title={model.sourceSchema.location}
                      />
                    </Field>
                    <Field label="Target Schema" className={styles.field} orientation="horizontal">
                      <Input
                        className={styles.control}
                        readOnly
                        value={model.targetSchema.inlineSchemaXml ? '- Inline Schema -' : model.targetSchema.location}
                        title={model.targetSchema.location}
                      />
                    </Field>
                  </>
                )}
                {category === 'Custom Header' && (
                  <>
                    <Field label="XsltEncoding" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={
                          customEncoding
                            ? 'custom'
                            : (encodings.find((encoding) => encoding.toLowerCase() === options.xsltEncoding.toLowerCase()) ?? '')
                        }
                        onChange={(_event, data) => {
                          setCustomEncoding(data.value === 'custom');
                          if (data.value !== 'custom') {
                            updateOption('xsltEncoding', data.value);
                          }
                        }}
                      >
                        {encodings.map((encoding) => (
                          <option key={encoding} value={encoding}>
                            {encoding || 'Unset'}
                          </option>
                        ))}
                        <option value="custom">Custom</option>
                      </Select>
                    </Field>
                    {customEncoding && (
                      <Field label="Custom encoding" className={styles.field} orientation="horizontal">
                        <Input
                          className={styles.control}
                          value={options.xsltEncoding}
                          onChange={(_event, data) => updateOption('xsltEncoding', data.value)}
                        />
                      </Field>
                    )}
                    <Field label="Method" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={options.outputMethod}
                        onChange={(_event, data) => updateOption('outputMethod', data.value as GridOptions['outputMethod'])}
                      >
                        {['xml', 'html', 'text'].map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Copy PIs" className={styles.field} orientation="horizontal">
                      <Checkbox
                        checked={options.copyProcessingInstructions ?? false}
                        onChange={(_event, data) => updateOption('copyProcessingInstructions', data.checked === true)}
                      />
                    </Field>
                    <Field label="Version" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={options.xsltVersion}
                        onChange={(_event, data) => updateOption('xsltVersion', data.value as GridOptions['xsltVersion'])}
                      >
                        <option value="1.0">1.0</option>
                        <option value="2.0">2.0</option>
                      </Select>
                    </Field>
                    <Field label="Standalone" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={options.standalone ?? ''}
                        onChange={(_event, data) => updateOption('standalone', (data.value || undefined) as GridOptions['standalone'])}
                      >
                        <option value="">Unset</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Field>
                    {textField('Doctype public', 'doctypePublic')}
                    {textField('Doctype system', 'doctypeSystem')}
                    {textField('CDATA section elements', 'cdataSectionElements')}
                    <Field label="Indent" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={options.indent ?? ''}
                        onChange={(_event, data) => updateOption('indent', (data.value || undefined) as GridOptions['indent'])}
                      >
                        <option value="">Unset</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </Select>
                    </Field>
                    {textField('Media-Type', 'mediaType')}
                    <Field label="Omit XML Declaration" className={styles.field} orientation="horizontal">
                      <Checkbox
                        checked={options.omitXmlDeclaration}
                        onChange={(_event, data) => updateOption('omitXmlDeclaration', data.checked === true)}
                      />
                    </Field>
                  </>
                )}
                {category === 'Compiler' && (
                  <>
                    <Field label="Custom XSLT Path" className={styles.field} orientation="horizontal">
                      <Input
                        className={styles.control}
                        value={customXsltPath ?? ''}
                        onChange={(_event, data) => setCustomXsltPath(data.value || undefined)}
                      />
                    </Field>
                    <Field label="Custom Extension XML path" className={styles.field} orientation="horizontal">
                      <Input
                        className={styles.control}
                        value={customExtensionXmlPath ?? ''}
                        onChange={(_event, data) => setCustomExtensionXmlPath(data.value || undefined)}
                      />
                    </Field>
                    <Field label="XSLT transform engine" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        value={options.xsltEngine === 'Undefined' ? '' : (options.xsltEngine ?? '')}
                        onChange={(_event, data) => updateOption('xsltEngine', data.value || undefined)}
                      >
                        <option value="" />
                        <option value=".Net Framework">.Net Framework</option>
                        {!!options.xsltEngine && !['.Net Framework', 'Undefined'].includes(options.xsltEngine) && (
                          <option value={options.xsltEngine}>{options.xsltEngine}</option>
                        )}
                      </Select>
                    </Field>
                    <Field label="Use XSL Transform" className={styles.field} orientation="horizontal">
                      <Select
                        className={styles.control}
                        disabled={options.xsltEngine !== '.Net Framework'}
                        value={options.useXslTransform ?? 'Undefined'}
                        onChange={(_event, data) => updateOption('useXslTransform', data.value as GridOptions['useXslTransform'])}
                      >
                        {['Undefined', 'Yes', 'No'].map((value) => (
                          <option key={value} value={value}>
                            {value === 'Undefined' ? '' : value}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </>
                )}
              </div>
            </DialogContent>
            <DialogActions className={styles.actions}>
              <Button appearance="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={() => onSave({ options, customXsltPath, customExtensionXmlPath, scriptTypePrecedence: precedence })}
              >
                Apply
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}

export class GridPropertiesDialog extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: MapDocument | null = null;
  private callbacks: GridPropertiesCallbacks | null = null;
  private renderVersion = 0;

  public configure(model: MapDocument, callbacks: GridPropertiesCallbacks): void {
    this.model = model;
    this.callbacks = callbacks;
    this.renderVersion++;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.renderReact();
  }

  public disconnectedCallback(): void {
    this.clear();
  }

  public clear(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.model = null;
    this.callbacks = null;
  }

  private renderReact(): void {
    if (!this.isConnected || !this.model || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(<GridPropertiesDialogView key={this.renderVersion} model={this.model} {...this.callbacks} />);
  }
}

customElements.define('biztalk-grid-properties-dialog', GridPropertiesDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-grid-properties-dialog': GridPropertiesDialog;
  }
}
