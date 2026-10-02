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
  makeStyles,
  tokens,
} from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
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
}

export interface SchemaNodePropertiesCallbacks {
  onClose(): void;
}

const useStyles = makeStyles({
  surface: { width: '480px', maxWidth: '90vw' },
  nodeName: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase400, marginBottom: tokens.spacingVerticalS },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, margin: 0 },
  row: { display: 'grid', gridTemplateColumns: '140px 1fr', gap: tokens.spacingHorizontalM, alignItems: 'baseline' },
  term: { color: tokens.colorNeutralForeground3 },
  value: { color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
  xpath: { fontFamily: tokens.fontFamilyMonospace },
  description: { color: tokens.colorNeutralForeground2, lineHeight: tokens.lineHeightBase300 },
});

interface SchemaNodePropertiesDialogViewProps extends SchemaNodePropertiesCallbacks {
  model: SchemaNodePropertiesViewModel;
}

function SchemaNodePropertiesDialogView({ model, onClose }: SchemaNodePropertiesDialogViewProps): React.ReactElement {
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
          <DialogBody>
            <DialogTitle>{model.title}</DialogTitle>
            <DialogContent>
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
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={onClose}>
                Close
              </Button>
            </DialogActions>
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

  private renderReact(): void {
    if (!this.isConnected || !this.model || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(<SchemaNodePropertiesDialogView key={this.renderVersion} model={this.model} onClose={this.callbacks.onClose} />);
  }
}

customElements.define('biztalk-schema-node-properties-dialog', SchemaNodePropertiesDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-schema-node-properties-dialog': SchemaNodePropertiesDialog;
  }
}
