import { Button, Dialog, DialogSurface, DialogContent, DialogBody, Spinner, Text } from '@fluentui/react-components';
import { Window24Regular, ErrorCircle24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import * as React from 'react';
import { useIntl } from 'react-intl';
import { useCopyInputControlStyles } from './styles';
import type { AgentQueryParams } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

export interface AgentUrlViewerProps {
  url: string;
  isOpen: boolean;
  queryParams?: AgentQueryParams;
  onClose: () => void;
}

type IframeState = 'loading' | 'loaded' | 'error';

export const AgentUrlViewer: React.FC<AgentUrlViewerProps> = ({ url, isOpen, queryParams, onClose }) => {
  const [iframeState, setIframeState] = React.useState<IframeState>('loading');
  const [iframeError, setIframeError] = React.useState<string>('');
  const intl = useIntl();
  const styles = useCopyInputControlStyles();
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  const DISPLAY_TEXT_CLOSE = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'ChhFFp',
    description: 'Label for the close button',
  });

  const DISPLAY_TEXT_LOADING = intl.formatMessage({
    defaultMessage: 'Loading...',
    id: 'QkwWB/',
    description: 'Loading message for iframe',
  });

  const DISPLAY_TEXT_ERROR = intl.formatMessage({
    defaultMessage:
      'The agent chat interface cannot be displayed in this environment due to security restrictions. Please use the external chat client.',
    id: '47k6r6',
    description: 'Error message when iframe fails to load',
  });

  const DISPLAY_TEXT_RETRY = intl.formatMessage({
    defaultMessage: 'Open Chat in New Tab',
    id: 'u0xUtD',
    description: 'Button text to open URL in new tab',
  });

  const handleIframeLoad = () => {
    setIframeState('loaded');
    setIframeError('');
  };

  const handleIframeError = () => {
    setIframeState('error');
    setIframeError(DISPLAY_TEXT_ERROR);
  };

  const linkUrl = useMemo(() => {
    return url + (queryParams ? `?${new URLSearchParams(queryParams).toString()}` : '');
  }, [url, queryParams]);

  const handleOpenInNewTab = () => {
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Reset iframe state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setIframeState('loading');
      setIframeError('');
    }
  }, [isOpen]);

  const renderIframeContent = () => {
    if (iframeState === 'error') {
      return (
        <div className={styles.errorContainer}>
          <ErrorCircle24Regular />
          <Text className={styles.errorMessage}>{iframeError}</Text>
          <Button appearance="primary" onClick={handleOpenInNewTab}>
            {DISPLAY_TEXT_RETRY}
          </Button>
        </div>
      );
    }

    return (
      <div className={styles.iframeContainer}>
        {linkUrl ? (
          <iframe
            ref={iframeRef}
            src={linkUrl}
            className={styles.iframe}
            title="Agent URL Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
          />
        ) : null}
        {iframeState === 'loading' && (
          <div className={styles.loadingOverlay}>
            <Spinner label={DISPLAY_TEXT_LOADING} />
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => data.open || onClose()}>
      <DialogSurface className={styles.dialogSurface}>
        <div className={styles.closeButtonContainer}>
          <Button
            appearance="transparent"
            icon={<Dismiss24Regular />}
            onClick={onClose}
            className={styles.closeButton}
            aria-label={DISPLAY_TEXT_CLOSE}
          />
        </div>
        <DialogBody className={styles.dialogBody}>
          <DialogContent className={styles.dialogContent}>{renderIframeContent()}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export interface AgentUrlButtonProps {
  url: string;
  onOpen: () => void;
}

export const AgentUrlButton = React.forwardRef<HTMLButtonElement, AgentUrlButtonProps>(({ url, onOpen }, ref) => {
  const intl = useIntl();

  const DISPLAY_TEXT_OPEN_POPUP = intl.formatMessage({
    defaultMessage: 'Open in popup',
    id: 'l9TY/4',
    description: 'ARIA label and tooltip text for the popup button',
  });

  if (!url) {
    return null;
  }

  return (
    <Button
      ref={ref}
      aria-label={DISPLAY_TEXT_OPEN_POPUP}
      icon={<Window24Regular />}
      appearance="transparent"
      size="small"
      onClick={onOpen}
    />
  );
});

AgentUrlButton.displayName = 'AgentUrlButton';
