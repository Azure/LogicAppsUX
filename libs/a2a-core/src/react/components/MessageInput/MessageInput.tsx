import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Textarea,
  tokens,
  makeStyles,
  shorthands,
  Badge,
} from '@fluentui/react-components';
import { SendRegular, AttachRegular, DismissRegular } from '@fluentui/react-icons';
import { useChatStore } from '../../store/chatStore';
import { generateMessageId } from '../../utils/messageUtils';
import { StatusMessage } from './StatusMessage';
import type { Attachment } from '../../types';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  attachmentPreview: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  attachmentItem: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
  },
  removeButton: {
    minWidth: 'auto',
    padding: '2px',
    height: 'auto',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  textarea: {
    flex: 1,
    minHeight: '40px',
    maxHeight: '120px',
    resize: 'none',
  },
  sendButton: {
    minWidth: '40px',
    height: '40px',
  },
});

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFileUpload?: boolean;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  contextId?: string;
  sessionId?: string; // For multi-session mode - check session-specific connection state
}

export function MessageInput({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  allowFileUpload = false,
  maxFileSize: _maxFileSize, // Not used with Fluent UI file input
  allowedFileTypes,
  contextId,
  sessionId,
}: MessageInputProps) {
  const styles = useStyles();
  const [message, setMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasTypingRef = useRef(false);
  const shouldRestoreFocusRef = useRef(true);
  const {
    isConnected: globalIsConnected,
    isTyping: globalIsTyping,
    getIsTypingForContext,
    getAuthRequiredForContext,
  } = useChatStore();

  // Get session-specific connection state for multi-session mode
  const sessionIsConnected = useChatStore((state) =>
    sessionId ? state.activeConnections.has(sessionId) : false
  );

  // Pending sessions are treated as "ready" even without connection
  // Connection will be created automatically when first message is sent
  const isPendingSession = sessionId?.startsWith('pending-');

  // Use session-specific connection state if sessionId provided, otherwise global
  // Pending sessions are always considered "connected" for input purposes
  const isConnected = sessionId ? isPendingSession || sessionIsConnected : globalIsConnected;

  // Get session-specific states, fallback to global state if no contextId
  const isTyping = contextId ? getIsTypingForContext(contextId) : globalIsTyping;
  const authRequired = getAuthRequiredForContext(contextId);

  // Disable input when:
  // 1. Not connected
  // 2. Streaming is active (isTyping)
  // 3. Auth is required (authRequired is not null)
  const isDisabled = disabled || !isConnected || isTyping || authRequired !== null;

  // Track if user focuses elsewhere while typing
  useEffect(() => {
    const handleFocusChange = (e: FocusEvent) => {
      // If typing is happening and user focuses on something else
      if (isTyping && e.target && e.target !== textareaRef.current) {
        // Don't restore focus if user intentionally focused elsewhere
        shouldRestoreFocusRef.current = false;
      }
    };

    document.addEventListener('focusin', handleFocusChange);
    return () => document.removeEventListener('focusin', handleFocusChange);
  }, [isTyping]);

  // Focus restoration when agent stops typing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    // If agent was typing and now stopped
    if (wasTypingRef.current && !isTyping) {
      // Only restore focus if we should (user didn't focus elsewhere)
      if (shouldRestoreFocusRef.current) {
        timeoutId = setTimeout(() => {
          if (textareaRef.current && !textareaRef.current.disabled) {
            textareaRef.current.focus();
          }
        }, 100);
      }

      // Reset for next time
      wasTypingRef.current = false;
      shouldRestoreFocusRef.current = true;
    }

    // Update the ref for next time
    if (isTyping) {
      wasTypingRef.current = true;
      // When typing starts, assume we should restore focus unless user clicks elsewhere
      shouldRestoreFocusRef.current = true;
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (message.trim() || pendingAttachments.length > 0) {
      const attachments: Attachment[] = pendingAttachments.map((file) => ({
        id: generateMessageId(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading' as const,
      }));

      onSendMessage(message.trim(), attachments);
      setMessage('');
      setPendingAttachments([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    setMessage(textarea.value);

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles = Array.from(files);
    setPendingAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Status message with priority hierarchy */}
      <StatusMessage
        isConnected={isConnected}
        isTyping={isTyping}
        hasAuthRequired={authRequired !== null}
      />

      {pendingAttachments.length > 0 && (
        <div className={styles.attachmentPreview}>
          {pendingAttachments.map((file, index) => (
            <Badge key={index} className={styles.attachmentItem} appearance="tint" size="large">
              <span>{file.name}</span>
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                size="small"
                className={styles.removeButton}
                onClick={() => removeAttachment(index)}
                aria-label={`Remove ${file.name}`}
              />
            </Badge>
          ))}
        </div>
      )}

      <div className={styles.inputWrapper}>
        {allowFileUpload && (
          <label htmlFor="file-upload">
            <Button
              appearance="subtle"
              icon={<AttachRegular />}
              disabled={isDisabled}
              onClick={() => document.getElementById('file-upload')?.click()}
              aria-label="Attach files"
            />
            <input
              id="file-upload"
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
              accept={allowedFileTypes?.join(',')}
            />
          </label>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={styles.textarea}
          resize="none"
          appearance="outline"
        />

        <Button
          appearance="primary"
          icon={<SendRegular />}
          disabled={isDisabled || (!message.trim() && pendingAttachments.length === 0)}
          className={styles.sendButton}
          type="submit"
          aria-label="Send message"
        />
      </div>
    </form>
  );
}
