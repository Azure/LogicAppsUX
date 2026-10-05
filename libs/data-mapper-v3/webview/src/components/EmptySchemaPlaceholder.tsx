import { Dropdown, FluentProvider, makeStyles, Option, Spinner, tokens } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

export type SchemaSide = 'source' | 'target';

export interface EmptySchemaCallbacks {
  onSelect(path?: string): void;
}

const addNewSchemaValue = '__add_new_schema__';

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' },
  content: { width: '100%', minWidth: 0, textAlign: 'center' },
  icon: { fontSize: '40px', marginBottom: '8px' },
  text: { marginBottom: '12px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' },
  picker: { width: 'min(180px, 90%)', minWidth: 0, maxWidth: '90%' },
  option: { fontSize: tokens.fontSizeBase200 },
});

function EmptySchemaPlaceholderView({
  side,
  availableSchemas,
  loading,
  onSelect,
}: { side: SchemaSide; availableSchemas: string[]; loading: boolean } & EmptySchemaCallbacks): React.ReactElement {
  const styles = useStyles();
  if (loading) {
    return (
      <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
        <div className={styles.root}>
          <Spinner size="small" label={`Loading ${side} schema...`} labelPosition="below" />
        </div>
      </FluentProvider>
    );
  }
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className={styles.root}>
        <div className={styles.content}>
          <div className={styles.icon}>📄</div>
          <p className={styles.text}>No {side} schema</p>
          <Dropdown
            aria-label={`Choose ${side} schema`}
            className={styles.picker}
            placeholder={`Choose ${side} schema`}
            onOptionSelect={(_event, data) => onSelect(data.optionValue === addNewSchemaValue ? undefined : data.optionValue)}
          >
            {availableSchemas.map((schemaName) => (
              <Option key={schemaName} value={schemaName} className={styles.option}>
                {schemaName}
              </Option>
            ))}
            <Option value={addNewSchemaValue} className={styles.option}>
              Add new schema...
            </Option>
          </Dropdown>
        </div>
      </div>
    </FluentProvider>
  );
}

export class EmptySchemaPlaceholder extends HTMLElement {
  private reactRoot: Root | null = null;
  private side: SchemaSide = 'source';
  private availableSchemas: string[] = [];
  private loading = false;
  private onSelect: (path?: string) => void = () => {};

  public configure(side: SchemaSide, availableSchemas: string[], onSelect: (path?: string) => void, loading = false): void {
    this.side = side;
    this.availableSchemas = availableSchemas;
    this.onSelect = onSelect;
    this.loading = loading;
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
    if (!this.isConnected) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(
      <EmptySchemaPlaceholderView
        side={this.side}
        availableSchemas={this.availableSchemas}
        loading={this.loading}
        onSelect={this.onSelect}
      />
    );
  }
}

customElements.define('biztalk-empty-schema', EmptySchemaPlaceholder);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-empty-schema': EmptySchemaPlaceholder;
  }
}
