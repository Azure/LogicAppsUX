import { Button, FluentProvider, makeStyles } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

export type SchemaSide = 'source' | 'target';

export interface EmptySchemaCallbacks {
  onLoad(): void;
}

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' },
  content: { textAlign: 'center' },
  icon: { fontSize: '40px', marginBottom: '8px' },
  text: { marginBottom: '12px', color: 'var(--vscode-descriptionForeground)', fontSize: '12px' },
});

function EmptySchemaPlaceholderView({ side, onLoad }: { side: SchemaSide } & EmptySchemaCallbacks): React.ReactElement {
  const styles = useStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className={styles.root}>
        <div className={styles.content}>
          <div className={styles.icon}>📄</div>
          <p className={styles.text}>No {side} schema</p>
          <Button appearance="primary" onClick={onLoad}>
            Load {side === 'source' ? 'Source' : 'Target'} Schema
          </Button>
        </div>
      </div>
    </FluentProvider>
  );
}

export class EmptySchemaPlaceholder extends HTMLElement {
  private reactRoot: Root | null = null;
  private side: SchemaSide = 'source';
  private onLoad: () => void = () => {};

  public configure(side: SchemaSide, onLoad: () => void): void {
    this.side = side;
    this.onLoad = onLoad;
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
    this.reactRoot.render(<EmptySchemaPlaceholderView side={this.side} onLoad={this.onLoad} />);
  }
}

customElements.define('biztalk-empty-schema', EmptySchemaPlaceholder);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-empty-schema': EmptySchemaPlaceholder;
  }
}
