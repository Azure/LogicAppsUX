import { FluentProvider, makeStyles } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

const useStyles = makeStyles({
  bar: {
    position: 'sticky',
    bottom: 0,
    zIndex: 15,
    display: 'flex',
    minHeight: '30px',
    flex: '0 0 30px',
    alignItems: 'stretch',
    paddingLeft: '8px',
    overflowX: 'auto',
    backgroundColor: 'var(--vscode-panel-background, var(--vscode-editor-background, #1e1e1e))',
    borderTop: '1px solid var(--vscode-panel-border, #444)',
  },
  tabs: { display: 'flex', alignItems: 'stretch' },
  tab: {
    height: '30px',
    padding: '4px 14px',
    backgroundColor: 'var(--vscode-tab-inactiveBackground, transparent)',
    color: 'var(--vscode-foreground, #ccc)',
    border: 0,
    borderRight: '1px solid var(--vscode-panel-border, #444)',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '12px',
    ':hover': { backgroundColor: 'var(--vscode-list-hoverBackground, #2a2d2e)' },
  },
  tabActive: {
    color: 'var(--vscode-tab-activeForeground, var(--vscode-foreground, #fff))',
    backgroundColor: 'var(--vscode-tab-activeBackground, var(--vscode-editor-background, #1e1e1e))',
    borderBottomColor: 'var(--vscode-focusBorder, #007fd4)',
    fontWeight: 600,
  },
  group: { display: 'inline-flex', alignItems: 'center', borderLeft: '1px solid var(--vscode-panel-border, #444)' },
  deleteBtn: {
    width: '20px',
    height: '22px',
    padding: 0,
    color: 'var(--vscode-descriptionForeground, #999)',
    backgroundColor: 'transparent',
    border: 0,
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '14px',
    ':hover:not(:disabled)': {
      color: 'var(--vscode-errorForeground, #f48771)',
      backgroundColor: 'var(--vscode-toolbar-hoverBackground, #2a2d2e)',
    },
    ':disabled': { opacity: 0.35, cursor: 'default' },
  },
  addBtn: {
    width: '30px',
    minWidth: '30px',
    height: '30px',
    padding: 0,
    color: 'var(--vscode-foreground, #ccc)',
    backgroundColor: 'transparent',
    border: 0,
    borderRight: '1px solid var(--vscode-panel-border, #444)',
    cursor: 'pointer',
    fontSize: '18px',
    ':hover': { backgroundColor: 'var(--vscode-toolbar-hoverBackground, #2a2d2e)' },
  },
  nameInput: {
    width: '120px',
    padding: '4px 8px',
    color: 'var(--vscode-input-foreground, #ccc)',
    backgroundColor: 'var(--vscode-input-background, #3c3c3c)',
    border: '1px solid var(--vscode-focusBorder, #007fd4)',
    borderRadius: '2px',
    fontFamily: 'inherit',
    fontSize: '12px',
    outline: 'none',
  },
});

export interface PageBarItem {
  name: string;
}

export interface PageBarCallbacks {
  onSelect(index: number): void;
  onRename(index: number, name: string): void;
  onAdd(): void;
  onDelete(index: number): void;
}

interface PageBarViewProps extends PageBarCallbacks {
  pages: PageBarItem[];
  activePage: number;
}

function PageBarView({ pages, activePage, onSelect, onRename, onAdd, onDelete }: PageBarViewProps): React.ReactElement {
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const clickTimer = useRef<number | undefined>(undefined);

  const beginRename = (index: number): void => {
    if (clickTimer.current !== undefined) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = undefined;
    }
    setDraft(pages[index]?.name ?? '');
    setRenamingIndex(index);
  };

  const commitRename = (index: number): void => {
    const name = draft.trim();
    setRenamingIndex(null);
    if (name && name !== pages[index]?.name) {
      onRename(index, name);
    }
  };

  const handleSelect = (index: number): void => {
    if (clickTimer.current !== undefined) {
      window.clearTimeout(clickTimer.current);
    }
    clickTimer.current = window.setTimeout(() => onSelect(index), 200);
  };

  const styles = useStyles();
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <nav className={styles.bar} aria-label="Map pages">
        <div className={styles.tabs}>
          {pages.map((page, index) =>
            index === renamingIndex ? (
              <input
                key={index}
                className={styles.nameInput}
                type="text"
                aria-label="Page name"
                value={draft}
                ref={(node) => node?.focus()}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename(index);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setRenamingIndex(null);
                  }
                }}
                onBlur={() => commitRename(index)}
              />
            ) : (
              <span className={styles.group} key={index}>
                <button
                  type="button"
                  className={`${styles.tab} ${index === activePage ? styles.tabActive : ''}`}
                  title="Double-click to rename"
                  onClick={() => handleSelect(index)}
                  onDoubleClick={() => beginRename(index)}
                >
                  {page.name}
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  title={pages.length === 1 ? 'A map must have at least one page' : `Delete ${page.name}`}
                  aria-label={`Delete ${page.name}`}
                  disabled={pages.length === 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(index);
                  }}
                >
                  ×
                </button>
              </span>
            )
          )}
          <button type="button" className={styles.addBtn} title="Add page" aria-label="Add page" onClick={onAdd}>
            +
          </button>
        </div>
      </nav>
    </FluentProvider>
  );
}

export class MapperPageBar extends HTMLElement {
  private reactRoot: Root | null = null;
  private pages: PageBarItem[] = [];
  private activePage = 0;
  private callbacks: PageBarCallbacks | null = null;
  private renderVersion = 0;

  public configure(pages: PageBarItem[], activePage: number, callbacks: PageBarCallbacks): void {
    this.pages = pages;
    this.activePage = activePage;
    this.callbacks = callbacks;
    this.renderVersion++;
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
    if (!this.isConnected || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(
      <PageBarView
        key={this.renderVersion}
        pages={this.pages}
        activePage={this.activePage}
        onSelect={this.callbacks.onSelect}
        onRename={this.callbacks.onRename}
        onAdd={this.callbacks.onAdd}
        onDelete={this.callbacks.onDelete}
      />
    );
  }
}

customElements.define('biztalk-mapper-page-bar', MapperPageBar);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-page-bar': MapperPageBar;
  }
}
