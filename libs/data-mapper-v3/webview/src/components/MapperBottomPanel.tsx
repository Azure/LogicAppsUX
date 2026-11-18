import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  mergeClasses,
} from '@fluentui/react-components';
import { ArrowUpload16Regular, DocumentAdd16Regular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VsCodeFluentProvider as FluentProvider } from '../fluentTheme';

const editorFont = 'var(--vscode-editor-font-family, Consolas, "Courier New", monospace)';

const useStyles = makeStyles({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid var(--vscode-panel-border, transparent)',
    backgroundColor: 'var(--vscode-editor-background)',
    minHeight: '36px',
    maxHeight: '350px',
    transition: 'max-height 0.2s ease',
  },
  collapsed: { maxHeight: '36px', overflow: 'hidden' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '4px 8px',
    backgroundColor: 'var(--vscode-sideBar-background, var(--vscode-editor-background))',
    borderBottom: '1px solid var(--vscode-panel-border, transparent)',
    flexShrink: 0,
  },
  tabs: { display: 'flex', gap: '2px' },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--vscode-foreground)',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    borderBottom: '2px solid transparent',
    opacity: 0.7,
    ':hover': { opacity: 1 },
  },
  tabActive: { opacity: 1, borderBottomColor: 'var(--vscode-focusBorder)', color: 'var(--vscode-foreground)' },
  actions: { display: 'flex', gap: '4px', alignItems: 'center' },
  body: { flex: 1, overflow: 'hidden', minHeight: 0 },
  content: { display: 'none', height: '100%' },
  contentActive: { display: 'flex', height: '250px' },
  editor: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground, var(--vscode-foreground))',
    border: 'none',
    padding: '8px 12px',
    fontFamily: editorFont,
    fontSize: '13px',
    lineHeight: 1.5,
    resize: 'none',
    outline: 'none',
    tabSize: 2,
    whiteSpace: 'pre',
    overflow: 'auto',
  },
  output: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground, var(--vscode-foreground))',
    border: 'none',
    padding: '8px 12px',
    margin: 0,
    fontFamily: editorFont,
    fontSize: '13px',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
  },
  outputError: { color: 'var(--vscode-errorForeground, var(--vscode-foreground))' },
});

export type BottomPanelTab = 'instance' | 'output';

export interface BottomPanelCallbacks {
  onUploadInput(): void;
  onGenerateInstance(): void;
  onRunTest(): void;
  onInputChange?(value: string): void;
  onViewStateChange?(tab: BottomPanelTab, collapsed: boolean): void;
}

interface BottomPanelViewProps extends BottomPanelCallbacks {
  hasMap: boolean;
  activeTab: BottomPanelTab;
  collapsed: boolean;
  inputXml: string;
  output: string;
  outputError: boolean;
  onTabChange(tab: BottomPanelTab): void;
  onToggleCollapsed(): void;
  onInputChange(value: string): void;
}

function BottomPanelView(props: BottomPanelViewProps): React.ReactElement {
  const styles = useStyles();
  const { hasMap, activeTab, collapsed, inputXml, output, outputError } = props;
  return (
    <FluentProvider style={{ display: 'contents' }}>
      <div
        className={collapsed ? `bottom-panel collapsed ${mergeClasses(styles.panel, styles.collapsed)}` : `bottom-panel ${styles.panel}`}
      >
        <div className={styles.header}>
          <div className={styles.tabs}>
            <button
              type="button"
              data-mapper-tutorial="input-tab"
              className={mergeClasses(styles.tab, activeTab === 'instance' && styles.tabActive)}
              onClick={() => props.onTabChange('instance')}
            >
              📝 Input Instance
            </button>
            <button
              type="button"
              data-mapper-tutorial="output-tab"
              className={mergeClasses(styles.tab, activeTab === 'output' && styles.tabActive)}
              onClick={() => props.onTabChange('output')}
            >
              📤 Test Output
            </button>
          </div>
          <div className={styles.actions}>
            <Menu positioning="above-end">
              <MenuTrigger disableButtonEnhancement>
                <MenuButton id="mapper-test-input" size="small" disabled={!hasMap}>
                  Test Input
                </MenuButton>
              </MenuTrigger>
              <MenuPopover data-mapper-tutorial="test-input-menu">
                <MenuList>
                  <MenuItem icon={<ArrowUpload16Regular />} onClick={props.onUploadInput}>
                    Upload input file
                  </MenuItem>
                  <MenuItem icon={<DocumentAdd16Regular />} onClick={props.onGenerateInstance}>
                    Generate instance
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <Button size="small" appearance="primary" disabled={!hasMap} onClick={props.onRunTest}>
              ▶ Test Map
            </Button>
            <Button size="small" onClick={props.onToggleCollapsed}>
              {collapsed ? '▲' : '▼'}
            </Button>
          </div>
        </div>
        <div className={styles.body}>
          <div className={mergeClasses(styles.content, activeTab === 'instance' && styles.contentActive)}>
            <textarea
              data-mapper-tutorial="input-xml"
              className={styles.editor}
              spellCheck={false}
              placeholder="Source XML"
              defaultValue={inputXml}
              onChange={(event) => props.onInputChange(event.target.value)}
            />
          </div>
          <div className={mergeClasses(styles.content, activeTab === 'output' && styles.contentActive)}>
            <pre className={mergeClasses(styles.output, outputError && styles.outputError)}>{output}</pre>
          </div>
        </div>
      </div>
    </FluentProvider>
  );
}

export class MapperBottomPanel extends HTMLElement {
  private reactRoot: Root | null = null;
  private callbacks: BottomPanelCallbacks | null = null;
  private hasMap = false;
  private activeTab: BottomPanelTab = 'instance';
  private collapsed = true;
  private inputXml = '';
  private output = '';
  private outputError = false;
  private inputVersion = 0;

  public configure(hasMap: boolean, activeTab: BottomPanelTab, collapsed: boolean, callbacks: BottomPanelCallbacks): void {
    this.hasMap = hasMap;
    this.activeTab = activeTab;
    this.collapsed = collapsed;
    this.callbacks = callbacks;
    this.renderReact();
  }

  public getInputXml(): string {
    return this.inputXml.trim();
  }

  public setInputXml(value: string): void {
    this.inputXml = value;
    this.inputVersion++;
    this.renderReact();
  }

  public setOutput(text: string, isError: boolean): void {
    this.output = text;
    this.outputError = isError;
    this.renderReact();
  }

  public setActiveTab(tab: BottomPanelTab): void {
    this.activeTab = tab;
    this.renderReact();
  }

  public setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
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
      <BottomPanelView
        key={this.inputVersion}
        hasMap={this.hasMap}
        activeTab={this.activeTab}
        collapsed={this.collapsed}
        inputXml={this.inputXml}
        output={this.output}
        outputError={this.outputError}
        onUploadInput={this.callbacks.onUploadInput}
        onGenerateInstance={this.callbacks.onGenerateInstance}
        onRunTest={this.callbacks.onRunTest}
        onTabChange={(tab) => {
          this.activeTab = tab;
          this.collapsed = false;
          this.callbacks?.onViewStateChange?.(this.activeTab, this.collapsed);
          this.renderReact();
        }}
        onToggleCollapsed={() => {
          this.collapsed = !this.collapsed;
          this.callbacks?.onViewStateChange?.(this.activeTab, this.collapsed);
          this.renderReact();
        }}
        onInputChange={(value) => {
          this.inputXml = value;
          this.callbacks?.onInputChange?.(value);
        }}
      />
    );
  }
}

customElements.define('biztalk-mapper-bottom-panel', MapperBottomPanel);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-bottom-panel': MapperBottomPanel;
  }
}
