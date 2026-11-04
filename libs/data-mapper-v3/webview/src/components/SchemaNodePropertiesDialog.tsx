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
  FluentProvider,
  makeStyles,
  tokens,
  Textarea,
} from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

export interface SchemaNodePropertyRow {
  label: string;
  value: string;
  isXPath?: boolean;
}

export interface SchemaNodePropertiesViewModel {
  title: string;
  nodeName: string;
  rows: SchemaNodePropertyRow[];
  description?: string;
  value?: {
    label: string;
    storedValue?: string;
    disabledReason?: string;
  };
}

export interface SchemaNodePropertiesCallbacks {
  onClose(): void;
  onSave?(value: string | undefined): void;
}

const useStyles = makeStyles({
  panel: { minWidth: 0, width: '100%', textAlign: 'left', lineHeight: tokens.lineHeightBase300 },
  surface: { width: '560px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  body: { minHeight: 0, overflow: 'hidden' },
  content: { overflowY: 'auto', minHeight: 0 },
  nodeName: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400, marginBottom: tokens.spacingVerticalS },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    margin: 0,
    padding: tokens.spacingHorizontalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(90px, 130px) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
    '@media (max-width: 480px)': { gridTemplateColumns: 'minmax(0, 1fr)', rowGap: tokens.spacingVerticalXXS },
  },
  term: { margin: 0, minWidth: 0, color: tokens.colorNeutralForeground3 },
  value: { margin: 0, minWidth: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
  xpath: { fontFamily: tokens.fontFamilyMonospace },
  description: { color: tokens.colorNeutralForeground2, lineHeight: tokens.lineHeightBase300 },
  editor: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalM },
  checkboxIndicator: { marginLeft: 0 },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS },
});

export function SchemaNodePropertiesContent({
  model,
  onSave,
  renderLayout,
}: {
  model: SchemaNodePropertiesViewModel;
  onSave?: SchemaNodePropertiesCallbacks['onSave'];
  renderLayout?: (content: React.ReactElement, applyButton: React.ReactElement | null) => React.ReactElement;
}): React.ReactElement {
  const styles = useStyles();
  const storedValue = model.value?.storedValue;
  const initialValue = storedValue === '<empty>' ? '' : (storedValue ?? '');
  const [enabled, setEnabled] = useState(storedValue !== undefined);
  const [value, setValue] = useState(initialValue);
  const changed = enabled !== (storedValue !== undefined) || (enabled && value !== initialValue);
  const applyButton =
    model.value && onSave && !model.value.disabledReason ? (
      <Button
        appearance="primary"
        disabled={!changed || (enabled && !!model.value.disabledReason)}
        onClick={() => onSave(enabled ? value || '<empty>' : undefined)}
      >
        Apply
      </Button>
    ) : null;
  const content = (
    <div className={styles.panel}>
      <div className={styles.nodeName}>{model.nodeName}</div>
      <dl className={styles.list}>
        {model.rows.map((row) => (
          <div className={styles.row} key={row.label}>
            <dt className={styles.term}>{row.label}</dt>
            <dd className={`${styles.value} ${row.isXPath ? styles.xpath : ''}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {model.description ? (
        <Field label="Description">
          <div className={styles.description}>{model.description}</div>
        </Field>
      ) : null}
      {model.value && onSave && !model.value.disabledReason ? (
        <div className={styles.editor}>
          <Checkbox
            indicator={{ className: styles.checkboxIndicator }}
            label={`Use ${model.value.label.toLowerCase()}`}
            checked={enabled}
            disabled={!!model.value.disabledReason && !enabled}
            onChange={(_event, data) => setEnabled(data.checked === true)}
          />
          <Field label={model.value.label} validationMessage={model.value.disabledReason} validationState="none">
            <Textarea value={value} disabled={!enabled || !!model.value.disabledReason} onChange={(_event, data) => setValue(data.value)} />
          </Field>
          {!renderLayout && (
            <div className={styles.actions}>
              {applyButton}
              <Button
                disabled={!changed}
                onClick={() => {
                  setEnabled(storedValue !== undefined);
                  setValue(initialValue);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
  return renderLayout ? renderLayout(content, applyButton) : content;
}

interface SchemaNodePropertiesDialogViewProps extends SchemaNodePropertiesCallbacks {
  model: SchemaNodePropertiesViewModel;
}

function SchemaNodePropertiesDialogView({ model, onClose, onSave }: SchemaNodePropertiesDialogViewProps): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <Dialog
        open
        modalType="modal"
        onOpenChange={(_event, data) => {
          if (!data.open) {
            onClose();
          }
        }}
      >
        <DialogSurface className={`${styles.surface} ${typographyStyles.base}`}>
          <DialogBody className={styles.body}>
            <DialogTitle>{model.title}</DialogTitle>
            <SchemaNodePropertiesContent
              model={model}
              onSave={onSave}
              renderLayout={(content, applyButton) => (
                <>
                  <DialogContent className={styles.content}>{content}</DialogContent>
                  <DialogActions>
                    {applyButton}
                    <Button id="schema-properties-close" appearance={applyButton ? 'secondary' : 'primary'} onClick={onClose}>
                      Close
                    </Button>
                  </DialogActions>
                </>
              )}
            />
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}

export class SchemaNodePropertiesDialog extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: SchemaNodePropertiesViewModel | null = null;
  private callbacks: SchemaNodePropertiesCallbacks | null = null;
  private renderVersion = 0;

  public configure(model: SchemaNodePropertiesViewModel, callbacks: SchemaNodePropertiesCallbacks): void {
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
    this.reactRoot.render(<SchemaNodePropertiesDialogView key={this.renderVersion} model={this.model} {...this.callbacks} />);
  }
}

customElements.define('biztalk-schema-node-properties-dialog', SchemaNodePropertiesDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-schema-node-properties-dialog': SchemaNodePropertiesDialog;
  }
}
