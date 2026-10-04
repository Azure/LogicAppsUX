import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  FluentProvider,
  Input,
  MessageBar,
  MessageBarBody,
  Tab,
  TabList,
  Textarea,
  Tooltip,
  makeStyles,
  tabClassNames,
  tokens,
} from '@fluentui/react-components';
import { Add16Regular, ArrowDown16Regular, ArrowUp16Regular, Dismiss16Regular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

export interface FunctoidConfigInput {
  isConstant: boolean;
  value: string;
  defaultValue: string;
  sourceLabel: string;
  /** Original input draft carried through so the controller can persist unchanged fields. */
  raw?: unknown;
}

export interface FunctoidConfigResultInput {
  isConstant: boolean;
  value: string;
  defaultValue: string;
  raw?: unknown;
}

export interface FunctoidConfigViewModel {
  title: string;
  meta: string;
  description: string;
  minInputs: number;
  maxInputs: number;
  hasOutput: boolean;
  outputs: string[];
  inputs: FunctoidConfigInput[];
  label: string;
  comments: string;
}

export interface FunctoidConfigResult {
  inputs: FunctoidConfigResultInput[];
  label: string;
  comments: string;
}

export interface FunctoidConfigCallbacks {
  onSave(result: FunctoidConfigResult): void;
  onCancel(): void;
}

const useStyles = makeStyles({
  surface: {
    width: '580px',
    height: '540px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
  },
  body: { height: '100%', minHeight: 0 },
  content: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  meta: {
    marginTop: '2px',
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
  },
  description: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  descriptionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
  },
  tabs: {
    // Pull the tab row toward the dialog's left edge.
    marginLeft: `calc(-1 * ${tokens.spacingHorizontalS})`,
    [`& .${tabClassNames.content}`]: {
      fontSize: tokens.fontSizeBase200,
      fontWeight: tokens.fontWeightSemibold,
    },
  },
  tabPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalL,
  },
  inputTabPanel: { flex: 1, minHeight: 0, overflow: 'hidden' },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  title: { fontSize: tokens.fontSizeBase400 },
  heading: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200 },
  requirement: { color: tokens.colorNeutralForeground3 },
  inputList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  scrollableInputList: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    paddingRight: tokens.spacingHorizontalXS,
  },
  inputRow: {
    display: 'grid',
    gridTemplateColumns: '54px minmax(0, 1fr) 64px 104px',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  inputName: { fontWeight: tokens.fontWeightSemibold },
  inputContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    padding: `${tokens.spacingVerticalXS} 0`,
  },
  inputKind: { color: tokens.colorNeutralForeground3, textAlign: 'center' },
  constantInput: { width: '84%' },
  defaultInput: { height: '26px', fontSize: '11px', width: '84%', boxSizing: 'border-box', padding: '2px 6px' },
  rowActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 32px)',
    gap: tokens.spacingHorizontalXS,
  },
  fallbackLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
  },
  fallbackInput: { width: '70%' },
  empty: { color: tokens.colorNeutralForeground3, padding: `${tokens.spacingVerticalS} 0` },
  fields: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, paddingTop: tokens.spacingVerticalM },
  actions: { paddingBottom: '18px' },
});

function expectedInputsText(minInputs: number, maxInputs: number): string {
  if (maxInputs >= 100) {
    return `${minInputs} or more`;
  }
  return minInputs === maxInputs ? `${minInputs}` : `${minInputs} to ${maxInputs}`;
}

interface FunctoidConfigDialogViewProps extends FunctoidConfigCallbacks {
  model: FunctoidConfigViewModel;
}

function FunctoidConfigDialogView({ model, onSave, onCancel }: FunctoidConfigDialogViewProps): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  const [activeTab, setActiveTab] = useState<string>('inputs');
  const [inputs, setInputs] = useState<FunctoidConfigInput[]>(() => model.inputs.map((input) => ({ ...input })));
  const [label, setLabel] = useState(model.label);
  const [comments, setComments] = useState(model.comments);

  const isValid = inputs.length >= model.minInputs && inputs.length <= model.maxInputs;
  const expected = expectedInputsText(model.minInputs, model.maxInputs);

  const updateInput = (index: number, patch: Partial<FunctoidConfigInput>): void => {
    setInputs((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addInput = (): void => {
    setInputs((current) =>
      current.length < model.maxInputs ? [...current, { isConstant: true, value: '', defaultValue: '', sourceLabel: '' }] : current
    );
  };

  const removeInput = (index: number): void => {
    setInputs((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveInput = (index: number, direction: -1 | 1): void => {
    setInputs((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = (): void => {
    if (!isValid) {
      return;
    }
    onSave({
      inputs: inputs.map((input) => ({
        isConstant: input.isConstant,
        value: input.value,
        defaultValue: input.defaultValue,
        raw: input.raw,
      })),
      label,
      comments,
    });
  };

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <Dialog
        open
        onOpenChange={(_event, data) => {
          if (!data.open) {
            onCancel();
          }
        }}
      >
        <DialogSurface className={`${styles.surface} ${typographyStyles.base}`}>
          <DialogBody className={`functoid-properties-panel ${styles.body}`}>
            <DialogTitle className={styles.title}>
              <span className="config-title">{model.title}</span>
              <div className={`${styles.meta} ${typographyStyles.base}`}>{model.meta}</div>
            </DialogTitle>
            <DialogContent className={styles.content}>
              <div className={`functoid-dialog-description ${styles.descriptionBlock}`}>
                <div className={`config-label ${styles.heading}`}>Description</div>
                <div className={`${styles.description} ${typographyStyles.base}`}>{model.description}</div>
              </div>
              <TabList
                className={`functoid-dialog-tabs ${styles.tabs}`}
                size="small"
                selectedValue={activeTab}
                onTabSelect={(_event, data) => setActiveTab(data.value as string)}
              >
                <Tab className="functoid-dialog-tab" data-functoid-tab="inputs" value="inputs">
                  Inputs
                </Tab>
                <Tab className="functoid-dialog-tab" data-functoid-tab="output" value="output">
                  Outputs
                </Tab>
                <Tab className="functoid-dialog-tab" data-functoid-tab="label" value="label">
                  Label and Comments
                </Tab>
              </TabList>
              {activeTab === 'inputs' && (
                <div data-functoid-panel="inputs" className={`${styles.tabPanel} ${styles.inputTabPanel}`}>
                  <div className={styles.toolbar}>
                    <div>
                      <div className={`functoid-ordered-inputs-heading ${styles.heading}`}>Ordered inputs</div>
                      <div className={`${styles.requirement} ${typographyStyles.base}`}>Inputs are evaluated from top to bottom.</div>
                    </div>
                    <Button
                      id="properties-add-input"
                      className={typographyStyles.base}
                      size="small"
                      icon={<Add16Regular />}
                      disabled={inputs.length >= model.maxInputs}
                      onClick={addInput}
                    >
                      Add input
                    </Button>
                  </div>
                  <MessageBar className="functoid-input-validation" intent={isValid ? 'success' : 'warning'}>
                    <MessageBarBody className={typographyStyles.base}>
                      Configured {inputs.length}; expected {expected} input{model.maxInputs === 1 ? '' : 's'}.
                    </MessageBarBody>
                  </MessageBar>
                  {inputs.length === 0 ? (
                    <div className={`${styles.empty} ${typographyStyles.base}`}>
                      No inputs configured. Add a value or connect a source node.
                    </div>
                  ) : (
                    <ol className={`${styles.inputList} ${styles.scrollableInputList}`}>
                      {inputs.map((input, index) => (
                        <li className={`functoid-input-row ${styles.inputRow}`} key={index}>
                          <span className={`${styles.inputName} ${typographyStyles.base}`}>Input[{index}]</span>
                          <div className={styles.inputContent}>
                            {input.isConstant ? (
                              <input
                                className={`functoid-default-input ${styles.defaultInput}`}
                                value={input.value}
                                placeholder="Enter a value"
                                aria-label={`Value for input ${index + 1}`}
                                onChange={(event) => updateInput(index, { value: event.target.value })}
                              />
                            ) : (
                              <>
                                <span className={typographyStyles.base}>{input.sourceLabel}</span>
                                <label className={`${styles.fallbackLabel} ${typographyStyles.base}`}>
                                  Fallback
                                  <input
                                    className={`functoid-default-input ${styles.defaultInput}`}
                                    value={input.defaultValue}
                                    aria-label={`Fallback value for input ${index + 1}`}
                                    onChange={(event) => updateInput(index, { defaultValue: event.target.value })}
                                  />
                                </label>
                              </>
                            )}
                          </div>
                          <span className={`${styles.inputKind} ${typographyStyles.base}`}>{input.isConstant ? 'Constant' : 'Link'}</span>
                          <div className={styles.rowActions}>
                            <Tooltip content="Move input up" relationship="label">
                              <Button
                                size="small"
                                appearance="subtle"
                                data-input-action="up"
                                data-index={index}
                                icon={<ArrowUp16Regular />}
                                disabled={index === 0}
                                onClick={() => moveInput(index, -1)}
                              />
                            </Tooltip>
                            <Tooltip content="Move input down" relationship="label">
                              <Button
                                size="small"
                                appearance="subtle"
                                data-input-action="down"
                                data-index={index}
                                icon={<ArrowDown16Regular />}
                                disabled={index === inputs.length - 1}
                                onClick={() => moveInput(index, 1)}
                              />
                            </Tooltip>
                            {input.isConstant && (
                              <Tooltip content="Remove input" relationship="label">
                                <Button
                                  size="small"
                                  appearance="subtle"
                                  data-input-action="remove"
                                  data-index={index}
                                  icon={<Dismiss16Regular />}
                                  onClick={() => removeInput(index)}
                                />
                              </Tooltip>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
              {activeTab === 'output' && (
                <div data-functoid-panel="output" className={styles.tabPanel}>
                  <div className={styles.heading}>Connected output</div>
                  <div className={`${styles.requirement} ${typographyStyles.base}`}>
                    {model.hasOutput
                      ? `${model.outputs.length} connection${model.outputs.length === 1 ? '' : 's'}`
                      : 'This functoid has no output.'}
                  </div>
                  {model.outputs.length > 0 ? (
                    <ul className={styles.inputList}>
                      {model.outputs.map((output, index) => (
                        <li className={typographyStyles.base} key={index}>
                          {output}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`${styles.empty} ${typographyStyles.base}`}>Output is not connected.</div>
                  )}
                </div>
              )}
              {activeTab === 'label' && (
                <div data-functoid-panel="label" className={styles.fields}>
                  <Field className={typographyStyles.base} label="Label" size="small">
                    <Input
                      id="properties-label"
                      size="small"
                      value={label}
                      maxLength={256}
                      placeholder="Optional canvas label"
                      onChange={(_event, data) => setLabel(data.value)}
                    />
                  </Field>
                  <Field className={typographyStyles.base} label="Comments" size="small">
                    <Textarea
                      id="properties-comments"
                      size="small"
                      value={comments}
                      maxLength={2048}
                      resize="vertical"
                      placeholder="Describe the purpose of this functoid"
                      onChange={(_event, data) => setComments(data.value)}
                    />
                  </Field>
                </div>
              )}
            </DialogContent>
            <DialogActions className={`config-actions ${styles.actions}`}>
              <Button className={typographyStyles.base} size="small" appearance="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                id="properties-save"
                className={typographyStyles.base}
                size="small"
                appearance="primary"
                disabled={!isValid}
                onClick={handleSave}
              >
                OK
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}

export class FunctoidConfigDialog extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: FunctoidConfigViewModel | null = null;
  private callbacks: FunctoidConfigCallbacks | null = null;
  private renderVersion = 0;

  public configure(model: FunctoidConfigViewModel, callbacks: FunctoidConfigCallbacks): void {
    this.model = model;
    this.callbacks = callbacks;
    this.renderVersion++;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.renderReact();
  }

  public disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
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
    this.reactRoot.render(
      <FunctoidConfigDialogView
        key={this.renderVersion}
        model={this.model}
        onSave={this.callbacks.onSave}
        onCancel={this.callbacks.onCancel}
      />
    );
  }
}

customElements.define('biztalk-functoid-config-dialog', FunctoidConfigDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-functoid-config-dialog': FunctoidConfigDialog;
  }
}
