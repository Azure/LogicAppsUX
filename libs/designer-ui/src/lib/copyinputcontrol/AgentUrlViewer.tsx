import { Button, Dialog, DialogSurface, DialogContent, DialogBody, Spinner, Text } from '@fluentui/react-components';
import { Window24Regular, ErrorCircle24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import * as React from 'react';
import { useIntl } from 'react-intl';
import { useCopyInputControlStyles } from './styles';

export interface AgentUrlViewerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

type IframeState = 'loading' | 'loaded' | 'error';

export const AgentUrlViewer: React.FC<AgentUrlViewerProps> = ({ url, isOpen, onClose }) => {
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
    defaultMessage: 'Failed to load URL. This may be due to security restrictions in the portal environment.',
    id: 'ix21Wi',
    description: 'Error message when iframe fails to load',
  });

  const DISPLAY_TEXT_RETRY = intl.formatMessage({
    defaultMessage: 'Open in New Tab',
    id: 'zZ4Z4b',
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

  const handleOpenInNewTab = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
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

export const AgentUrlButton: React.FC<AgentUrlButtonProps> = ({ url, onOpen }) => {
  const intl = useIntl();

  const DISPLAY_TEXT_OPEN_POPUP = intl.formatMessage({
    defaultMessage: 'Open in popup',
    id: 'l9TY/4',
    description: 'ARIA label and tooltip text for the popup button',
  });

  if (!url) {
    return null;
  }

  return <Button aria-label={DISPLAY_TEXT_OPEN_POPUP} icon={<Window24Regular />} appearance="transparent" size="small" onClick={onOpen} />;
};
