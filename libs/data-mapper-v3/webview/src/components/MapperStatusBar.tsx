import { FluentProvider, makeStyles } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

export interface MapperStatusBarViewModel {
  links: number;
  functoids: number;
  sourceName: string;
  targetName: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '3px 12px',
    backgroundColor: 'var(--vscode-statusBar-background, #007acc)',
    color: 'var(--vscode-statusBar-foreground, white)',
    fontSize: '11px',
    flexShrink: 0,
  },
  item: { display: 'flex', gap: '4px' },
  sep: { opacity: 0.5 },
});

function MapperStatusBarView({ links, functoids, sourceName, targetName }: MapperStatusBarViewModel): React.ReactElement {
  const styles = useStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className={styles.root}>
        <span className={styles.item}>
          Links: <strong>{links}</strong>
        </span>
        <span className={styles.item}>
          Functoids: <strong>{functoids}</strong>
        </span>
        <span className={styles.sep}>|</span>
        <span className={styles.item}>Src: {sourceName}</span>
        <span className={styles.item}>Tgt: {targetName}</span>
      </div>
    </FluentProvider>
  );
}

export class MapperStatusBar extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: MapperStatusBarViewModel = { links: 0, functoids: 0, sourceName: 'None', targetName: 'None' };

  public configure(model: MapperStatusBarViewModel): void {
    this.model = model;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.style.display = 'contents';
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
    this.reactRoot.render(<MapperStatusBarView {...this.model} />);
  }
}

customElements.define('biztalk-mapper-statusbar', MapperStatusBar);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-statusbar': MapperStatusBar;
  }
}
