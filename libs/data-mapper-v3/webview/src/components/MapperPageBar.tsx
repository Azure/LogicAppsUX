import { makeStyles } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VsCodeFluentProvider as FluentProvider } from '../fluentTheme';

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
    backgroundColor: 'var(--vscode-panel-background, var(--vscode-editor-background))',
    borderTop: '1px solid var(--vscode-panel-border, transparent)',
  },
  tabs: { display: 'flex', alignItems: 'stretch' },
  tab: {
    height: '30px',
    padding: '4px 14px',
    backgroundColor: 'var(--vscode-tab-inactiveBackground, transparent)',
    color: 'var(--vscode-foreground)',
    border: 0,
    borderRight: '1px solid var(--vscode-panel-border, transparent)',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '12px',
    ':hover': { backgroundColor: 'var(--vscode-list-hoverBackground, transparent)' },
  },
  tabActive: {
    color: 'var(--vscode-tab-activeForeground, var(--vscode-foreground))',
    backgroundColor: 'var(--vscode-tab-activeBackground, var(--vscode-editor-background))',
    borderBottomColor: 'var(--vscode-focusBorder)',
    fontWeight: 600,
  },
  group: { display: 'inline-flex', alignItems: 'center', borderLeft: '1px solid var(--vscode-panel-border, transparent)' },
  deleteBtn: {
    width: '20px',
    height: '22px',
    padding: 0,
    color: 'var(--vscode-descriptionForeground, var(--vscode-foreground))',
    backgroundColor: 'transparent',
    border: 0,
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '14px',
    ':hover:not(:disabled)': {
      color: 'var(--vscode-errorForeground, var(--vscode-foreground))',
      backgroundColor: 'var(--vscode-toolbar-hoverBackground, transparent)',
    },
    ':disabled': { opacity: 0.35, cursor: 'default' },
  },
  addBtn: {
    width: '30px',
    minWidth: '30px',
    height: '30px',
    padding: 0,
    color: 'var(--vscode-foreground)',
    backgroundColor: 'transparent',
    border: 0,
    borderRight: '1px solid var(--vscode-panel-border, transparent)',
    cursor: 'pointer',
    fontSize: '18px',
    ':hover': { backgroundColor: 'var(--vscode-toolbar-hoverBackground, transparent)' },
  },
  nameInput: {
    width: '120px',
    padding: '4px 8px',
    color: 'var(--vscode-input-foreground, var(--vscode-foreground))',
    backgroundColor: 'var(--vscode-input-background, var(--vscode-editor-background))',
    border: '1px solid var(--vscode-focusBorder)',
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

  const commitRename = (index: number, value: string = draft): void => {
    const name = value.trim();
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
    <FluentProvider style={{ display: 'contents' }}>
      <nav className={styles.bar} aria-label="Map pages">
        <div className={styles.tabs}>
          {pages.map((page, index) =>
            index === renamingIndex ? (
              <input
                key={index}
                className={`page-name-input ${styles.nameInput}`}
                type="text"
                aria-label="Page name"
                value={draft}
                ref={(node) => node?.focus()}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRename(index, event.currentTarget.value);
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setRenamingIndex(null);
                  }
                }}
                onBlur={(event) => commitRename(index, event.currentTarget.value)}
              />
            ) : (
              <span className={styles.group} key={index}>
                <button
                  type="button"
                  className={`page-tab ${styles.tab} ${index === activePage ? styles.tabActive : ''}`}
                  title="Double-click to rename"
                  onClick={() => handleSelect(index)}
                  onDoubleClick={() => beginRename(index)}
                >
                  {page.name}
                </button>
                <button
                  type="button"
                  className={`page-delete-btn ${styles.deleteBtn}`}
                  data-page={index}
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
          <button type="button" id="btn-add-page" className={styles.addBtn} title="Add page" aria-label="Add page" onClick={onAdd}>
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
