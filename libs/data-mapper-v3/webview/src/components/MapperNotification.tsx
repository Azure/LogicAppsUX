import {
  Button,
  FluentProvider,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
} from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { getVsCodeFluentTheme } from '../fluentTheme';

export type NotificationType = 'success' | 'warning' | 'error';

export interface NotificationCallbacks {
  onClose(): void;
}

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    bottom: '30px',
    right: '16px',
    maxWidth: '400px',
    zIndex: 100,
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
  details: {
    marginTop: '6px',
    fontSize: '10px',
    opacity: 0.9,
    whiteSpace: 'pre-wrap',
    maxHeight: '100px',
    overflowY: 'auto',
  },
});

function NotificationView({
  title,
  type,
  details,
  onClose,
}: { title: string; type: NotificationType; details?: string } & NotificationCallbacks): React.ReactElement {
  const styles = useStyles();
  const intent = type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'error';
  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <div className={styles.root}>
        <MessageBar intent={intent} layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{title}</MessageBarTitle>
            {details ? <pre className={styles.details}>{details}</pre> : null}
          </MessageBarBody>
          <MessageBarActions
            containerAction={<Button appearance="transparent" icon={<DismissRegular />} aria-label="Dismiss" onClick={onClose} />}
          />
        </MessageBar>
      </div>
    </FluentProvider>
  );
}

export class MapperNotification extends HTMLElement {
  private reactRoot: Root | null = null;
  private titleText = '';
  private type: NotificationType = 'success';
  private details?: string;
  private onClose: () => void = () => {};

  public configure(title: string, type: NotificationType, details: string | undefined, onClose: () => void): void {
    this.titleText = title;
    this.type = type;
    this.details = details;
    this.onClose = onClose;
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
    this.reactRoot.render(<NotificationView title={this.titleText} type={this.type} details={this.details} onClose={this.onClose} />);
  }
}

customElements.define('biztalk-mapper-notification', MapperNotification);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-mapper-notification': MapperNotification;
  }
}
