import { Dropdown, FluentProvider, Link, makeStyles, Option, Spinner, tokens } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SchemaLoadError } from '../../../src/protocol/mapEditorProtocol';
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
  error: {
    marginBottom: '12px',
    color: 'var(--vscode-errorForeground)',
    fontSize: '12px',
    overflowWrap: 'anywhere',
    textAlign: 'left',
  },
  errorLink: { display: 'block', marginTop: '6px', fontSize: '12px' },
  picker: { width: 'min(180px, 90%)', minWidth: 0, maxWidth: '90%' },
  pickerButton: { minWidth: 0 },
  pickerText: { display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  option: { fontSize: tokens.fontSizeBase200 },
});

function EmptySchemaPlaceholderView({
  side,
  availableSchemas,
  loading,
  error,
  onSelect,
}: { side: SchemaSide; availableSchemas: string[]; loading: boolean; error?: SchemaLoadError } & EmptySchemaCallbacks): React.ReactElement {
  const styles = useStyles();
  const [selectedSchema, setSelectedSchema] = React.useState<string>();
  const pickerPlaceholder = `Choose ${side} schema`;
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
          {error ? (
            <div className={styles.error} role="alert">
              {error.message}
              <Link as="button" className={styles.errorLink} onClick={() => onSelect(undefined)}>
                Load your schema file
              </Link>
            </div>
          ) : (
            <p className={styles.text}>No {side} schema</p>
          )}
          <Dropdown
            aria-label={`Choose ${side} schema`}
            className={styles.picker}
            button={{
              className: styles.pickerButton,
              title: selectedSchema,
              children: <span className={styles.pickerText}>{selectedSchema ?? pickerPlaceholder}</span>,
            }}
            placeholder={pickerPlaceholder}
            onOptionSelect={(_event, data) => {
              const isAddNew = data.optionValue === addNewSchemaValue;
              setSelectedSchema(isAddNew ? undefined : data.optionValue);
              onSelect(isAddNew ? undefined : data.optionValue);
            }}
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
  private error: SchemaLoadError | undefined;
  private onSelect: (path?: string) => void = () => {};

  public configure(
    side: SchemaSide,
    availableSchemas: string[],
    onSelect: (path?: string) => void,
    loading = false,
    error?: SchemaLoadError
  ): void {
    this.side = side;
    this.error = error;
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
        error={this.error}
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
