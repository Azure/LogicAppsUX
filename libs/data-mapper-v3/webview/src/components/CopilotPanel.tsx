import { Button, FluentProvider, makeStyles } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

const useStyles = makeStyles({
  panel: {
    padding: '10px 12px',
    backgroundColor: 'var(--vscode-sideBar-background, #252526)',
    borderBottom: '1px solid var(--vscode-panel-border, #444)',
    flexShrink: 0,
  },
  heading: { display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' },
  headingTitle: { display: 'block', marginBottom: '2px' },
  muted: { color: 'var(--vscode-descriptionForeground, #aaa)', fontSize: '11px' },
  controls: { display: 'flex', gap: '10px' },
  prompt: {
    flex: 1,
    minHeight: '66px',
    padding: '6px 8px',
    border: '1px solid var(--vscode-input-border, #3c3c3c)',
    color: 'var(--vscode-input-foreground, #ccc)',
    backgroundColor: 'var(--vscode-input-background, #3c3c3c)',
    resize: 'vertical',
    fontFamily: 'inherit',
    fontSize: '12px',
  },
  contextToolbar: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px' },
  contextFiles: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', flexWrap: 'wrap' },
  contextFile: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    maxWidth: '240px',
    padding: '2px 5px 2px 8px',
    backgroundColor: 'var(--vscode-badge-background, #4d4d4d)',
    color: 'var(--vscode-badge-foreground, #fff)',
    borderRadius: '10px',
    fontSize: '11px',
  },
  contextFileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeContext: { padding: '0 2px', border: 0, color: 'inherit', backgroundColor: 'transparent', cursor: 'pointer' },
  result: { marginTop: '7px', color: 'var(--vscode-foreground, #ccc)', fontSize: '12px' },
  hint: { marginTop: '5px', color: 'var(--vscode-descriptionForeground, #aaa)', fontSize: '11px' },
});

export interface CopilotContextFile {
  id: string;
  name: string;
  size: number;
}

export interface CopilotPanelViewModel {
  draft: string;
  busy: boolean;
  hasMap: boolean;
  message: string;
  contextFiles: CopilotContextFile[];
}

export interface CopilotPanelCallbacks {
  onSubmit(prompt: string): void;
  onAddContext(): void;
  onClearContext(): void;
  onRemoveContext(id: string): void;
  onClose(): void;
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
}

interface CopilotPanelViewProps extends CopilotPanelCallbacks {
  model: CopilotPanelViewModel;
}

function CopilotPanelView({
  model,
  onSubmit,
  onAddContext,
  onClearContext,
  onRemoveContext,
  onClose,
}: CopilotPanelViewProps): React.ReactElement {
  const styles = useStyles();
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const submit = (): void => {
    const prompt = (promptRef.current?.value ?? model.draft).trim();
    if (prompt && model.hasMap && !model.busy) {
      onSubmit(prompt);
    }
  };

  const submitValue = (value: string): void => {
    const prompt = value.trim();
    if (prompt && model.hasMap && !model.busy) {
      onSubmit(prompt);
    }
  };

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <strong className={styles.headingTitle}>Data Mapper Assistant</strong>
            <span className={styles.muted}>
              Describe links, functoids, constants, or page changes. Review is required before the BTM is updated.
            </span>
          </div>
          <Button
            appearance="transparent"
            icon={<DismissRegular />}
            title="Close"
            aria-label="Close Data Mapper Assistant"
            onClick={onClose}
          />
        </div>
        <div className={styles.controls}>
          <textarea
            id="copilot-prompt"
            ref={promptRef}
            autoFocus
            rows={3}
            disabled={model.busy}
            defaultValue={model.draft}
            placeholder="Example: On this page, connect CustomerName to FullName using String Concatenate."
            className={styles.prompt}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                submitValue(event.currentTarget.value);
              }
            }}
          />
          <Button appearance="primary" disabled={model.busy || !model.hasMap} onClick={submit}>
            {model.busy ? 'Working…' : 'Apply with Assistant'}
          </Button>
        </div>
        <div className={styles.contextToolbar}>
          <Button id="copilot-add-context" size="small" disabled={model.busy} onClick={onAddContext}>
            ＋ Add context files
          </Button>
          {model.contextFiles.length > 0 ? (
            <Button size="small" appearance="transparent" disabled={model.busy} onClick={onClearContext}>
              Clear all
            </Button>
          ) : (
            <span className={styles.muted}>No additional context files</span>
          )}
        </div>
        {model.contextFiles.length > 0 ? (
          <div className={styles.contextFiles}>
            {model.contextFiles.map((file) => (
              <span
                className={`copilot-context-file ${styles.contextFile}`}
                title={`${file.name} (${formatFileSize(file.size)})`}
                key={file.id}
              >
                <span className={styles.contextFileName}>{file.name}</span>
                <button
                  type="button"
                  className={`copilot-remove-context ${styles.removeContext}`}
                  aria-label={`Remove ${file.name}`}
                  disabled={model.busy}
                  onClick={() => onRemoveContext(file.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {model.message ? <div className={`copilot-result ${styles.result}`}>{model.message}</div> : null}
        <div className={styles.hint}>Press Ctrl+Enter to submit. Assistant output is validated and applied as one undoable edit.</div>
      </section>
    </FluentProvider>
  );
}

export class CopilotPanel extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: CopilotPanelViewModel | null = null;
  private callbacks: CopilotPanelCallbacks | null = null;

  public configure(model: CopilotPanelViewModel, callbacks: CopilotPanelCallbacks): void {
    this.model = model;
    this.callbacks = callbacks;
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
    if (!this.isConnected || !this.model || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(
      <CopilotPanelView
        model={this.model}
        onSubmit={this.callbacks.onSubmit}
        onAddContext={this.callbacks.onAddContext}
        onClearContext={this.callbacks.onClearContext}
        onRemoveContext={this.callbacks.onRemoveContext}
        onClose={this.callbacks.onClose}
      />
    );
  }
}

customElements.define('biztalk-copilot-panel', CopilotPanel);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-copilot-panel': CopilotPanel;
  }
}
