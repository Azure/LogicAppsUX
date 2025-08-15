import { Input, Button, Tooltip, mergeClasses } from '@fluentui/react-components';
import { bundleIcon, Copy24Regular, Copy24Filled, Checkmark24Regular } from '@fluentui/react-icons';
import * as React from 'react';
import { useIntl } from 'react-intl';
import { useCopyInputControlStyles } from './styles';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export interface CopyInputControlProps {
  ariaLabelledBy?: string;
  placeholder?: string;
  text: string;
  onCopy?(): void;
  children?: React.ReactNode;
  copyButtonLabel?: string;
}

const CopyIcon = bundleIcon(Copy24Filled, Copy24Regular);

export const CopyInputControl = React.forwardRef<Pick<HTMLElement, 'focus' | 'scrollIntoView'>, CopyInputControlProps>(
  ({ ariaLabelledBy, placeholder, text: url, onCopy, children, copyButtonLabel }, ref) => {
    const [isCopied, setIsCopied] = React.useState(false);
    const disabled = React.useMemo(() => {
      try {
        return !navigator.clipboard;
      } catch {
        return true;
      }
    }, []);
    const intl = useIntl();
    const styles = useCopyInputControlStyles();
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => ({
      focus() {
        buttonRef.current?.focus();
      },
      scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
        containerRef.current?.scrollIntoView(options);
      },
    }));

    const DEFAULT_DISPLAY_TEXT_COPY_URL = intl.formatMessage({
      defaultMessage: 'Copy URL',
      id: '7yFLpB',
      description: 'ARIA label and tooltip text for the copy button',
    });

    const DISPLAY_TEXT_COPIED = intl.formatMessage({
      defaultMessage: 'Copied!',
      id: 'IG4h5u',
      description: 'Confirmation message when URL is copied',
    });

    const copyLabel = copyButtonLabel ?? DEFAULT_DISPLAY_TEXT_COPY_URL;

    const handleCopyClick = async () => {
      try {
        // Always select the text first for visual feedback
        const input = inputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(0, url.length);
        }

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(url);
        } else if (input) {
          // Fallback for older browsers
          document.execCommand('copy');
        }

        // Show copied feedback
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds

        onCopy?.();
      } catch (error) {
        LoggerService().log({ level: LogEntryLevel.Error, message: `Failed to copy text: ${error}`, area: 'CopyInputControl' });
        // Fallback to the old method
        const input = inputRef.current;
        if (input) {
          input.focus();
          input.setSelectionRange(0, url.length);
          document.execCommand('copy');
          // Show copied feedback even on fallback
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          onCopy?.();
        }
      }
    };

    return (
      <div className={mergeClasses(styles.container, 'msla-copy-input-control')} ref={containerRef}>
        <Input
          data-automation-id="msla-copy-input-control-textbox"
          aria-labelledby={ariaLabelledBy}
          className={isCopied ? styles.textInputSelected : styles.textInput}
          ref={inputRef}
          placeholder={placeholder}
          readOnly
          value={url}
        />
        <Tooltip content={isCopied ? DISPLAY_TEXT_COPIED : copyLabel} relationship="label">
          <Button
            aria-label={isCopied ? DISPLAY_TEXT_COPIED : copyLabel}
            ref={buttonRef}
            disabled={disabled}
            icon={isCopied ? <Checkmark24Regular /> : <CopyIcon />}
            appearance="transparent"
            size="small"
            onClick={handleCopyClick}
            className={isCopied ? styles.copiedButton : undefined}
          />
        </Tooltip>
        {children}
      </div>
    );
  }
);

CopyInputControl.displayName = 'CopyInputControl';

// Export the agent-related components
export { AgentUrlViewer, AgentUrlButton } from './AgentUrlViewer';
export { CopyInputControlWithAgent } from './CopyInputControlWithAgent';
export type { AgentUrlViewerProps, AgentUrlButtonProps } from './AgentUrlViewer';
export type { CopyInputControlWithAgentProps } from './CopyInputControlWithAgent';
