import { FluentProvider, makeStyles, Toolbar, ToolbarButton, ToolbarGroup, tokens } from '@fluentui/react-components';
import { Beaker20Regular, Bot20Regular, CloudArrowUp20Regular, PlayCircle20Regular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

interface MapperToolbarViewProps {
  disabled: boolean;
  status: string;
  onCopilot(): void;
  onDeploy(): void;
  onTest(): void;
  onValidateAndCompile(): void;
}

const useStyles = makeStyles({
  provider: {
    display: 'contents',
  },
  toolbar: {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    width: '100%',
    minHeight: '40px',
    padding: `0 ${tokens.spacingHorizontalS}`,
    flexShrink: 0,
    overflowX: 'auto',
    backgroundColor: 'var(--vscode-panel-background, var(--vscode-editor-background))',
    borderBottom: '1px solid var(--vscode-panel-border, transparent)',
  },
  group: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  command: {
    color: 'var(--vscode-foreground)',
  },
  primaryCommand: {
    color: 'var(--vscode-textLink-foreground)',
  },
  status: {
    marginLeft: 'auto',
    color: 'var(--vscode-descriptionForeground)',
  },
  statusActive: {
    color: '#4fc1ff',
  },
});

function MapperToolbarView({
  disabled,
  status,
  onCopilot,
  onDeploy,
  onTest,
  onValidateAndCompile,
}: MapperToolbarViewProps): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} className={styles.provider}>
      <Toolbar className={`mapper-toolbar ${styles.toolbar} ${typographyStyles.base}`} aria-label="Map commands">
        <ToolbarGroup className={styles.group}>
          <ToolbarButton
            id="btn-validate-compile"
            className={styles.primaryCommand}
            icon={<PlayCircle20Regular />}
            disabled={disabled}
            onClick={onValidateAndCompile}
          >
            Validate and Compile
          </ToolbarButton>
          <ToolbarButton id="btn-test-map" className={styles.command} icon={<Beaker20Regular />} disabled={disabled} onClick={onTest}>
            Test Map
          </ToolbarButton>
          <ToolbarButton
            id="btn-deploy-logicapp"
            className={styles.command}
            icon={<CloudArrowUp20Regular />}
            disabled={disabled}
            onClick={onDeploy}
          >
            Deploy to Logic Apps
          </ToolbarButton>
          <ToolbarButton id="btn-copilot" className={styles.primaryCommand} icon={<Bot20Regular />} disabled={disabled} onClick={onCopilot}>
            Data Mapper Assistant
          </ToolbarButton>
        </ToolbarGroup>
        <span className={`${styles.status} ${status ? styles.statusActive : ''}`} id="toolbar-status" role="status">
          {status}
        </span>
      </Toolbar>
    </FluentProvider>
  );
}

export class MapperToolbar extends HTMLElement {
  private reactRoot: Root | null = null;
  private props: MapperToolbarViewProps = {
    disabled: true,
    status: '',
    onCopilot: () => {},
    onDeploy: () => {},
    onTest: () => {},
    onValidateAndCompile: () => {},
  };

  public configure(props: MapperToolbarViewProps): void {
    this.props = props;
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
    this.reactRoot.render(<MapperToolbarView {...this.props} />);
  }
}

customElements.define('biztalk-mapper-toolbar', MapperToolbar);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-toolbar': MapperToolbar;
  }
}
