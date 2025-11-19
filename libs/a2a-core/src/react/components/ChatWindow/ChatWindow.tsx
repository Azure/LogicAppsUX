import React, { useState, useCallback } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  mergeClasses,
  Input,
  Tooltip,
} from '@fluentui/react-components';
import {
  PanelLeftExpandRegular,
  PanelLeftContractRegular,
  EditRegular,
} from '@fluentui/react-icons';
import { MessageList } from '../MessageList';
import { MessageInput } from '../MessageInput';
import { CompanyLogo } from '../CompanyLogo';
import { useChatWidget } from '../../hooks/useChatWidget';
import { useTheme } from '../../hooks/useTheme';
import type { ChatWidgetProps } from '../../types';

const useStyles = makeStyles({
  chatWindow: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    height: '60px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  headerWithLogo: {
    height: '66px', // 10% more height when logo is present
    paddingLeft: '26px', // 10px more padding on left side
  },
  headerContent: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  agentInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  agentName: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  agentDescription: {
    margin: 0,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  sessionInfo: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    flex: 1,
    minWidth: 0, // Allow flex item to shrink below content size
  },
  sessionTitleContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    maxWidth: '100%',
    minWidth: 0, // Allow flex item to shrink
  },
  sessionTitle: {
    fontSize: tokens.fontSizeBase500, // Larger, more prominent
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1, // Darker, more prominent
    cursor: 'pointer',
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '500px', // Max width for long titles
    ':hover': {
      color: tokens.colorBrandForeground1,
      textDecoration: 'underline',
    },
  },
  sessionTitleInput: {
    flex: 1,
    minWidth: 0,
  },
  editButton: {
    minWidth: 'auto',
    flexShrink: 0,
    opacity: 0.7,
    ':hover': {
      opacity: 1,
    },
  },
  agentInfoCompact: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
    marginLeft: 'auto',
    paddingLeft: tokens.spacingHorizontalM,
    flexShrink: 0,
    '@media (max-width: 768px)': {
      display: 'none', // Hide on mobile
    },
  },
  agentNameCompact: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground3,
    textAlign: 'right',
  },
  agentDescriptionCompact: {
    margin: 0,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground4,
    textAlign: 'right',
    '@media (max-width: 1024px)': {
      display: 'none', // Hide description on tablets
    },
  },
  messageListContainer: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  footer: {
    flexShrink: 0,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  messageInputWrapper: {
    flexShrink: 0,
  },
});

export interface ChatWindowProps extends ChatWidgetProps {
  // All props come from ChatWidgetProps
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  mode?: 'light' | 'dark';
  sessionId?: string; // For multi-session mode
}

export function ChatWindow(props: ChatWindowProps) {
  const styles = useStyles();
  const {
    agentCard,
    auth,
    theme,
    placeholder,
    welcomeMessage,
    allowFileUpload,
    maxFileSize,
    allowedFileTypes,
    onMessage,
    onConnectionChange,
    userName,
    sessionKey,
    agentUrl,
    onToggleSidebar,
    isSidebarCollapsed,
    apiKey,
    oboUserToken,
    onUnauthorized,
    onContextIdChange,
    sessionName,
    onRenameSession,
    storageConfig,
    initialContextId,
    mode = 'light',
  } = props;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Apply theme if provided
  useTheme(theme, mode);

  const {
    isConnected,
    agentName,
    agentDescription,
    sendMessage,
    handleAuthCompleted,
    handleAuthCanceled,
    contextId,
  } = useChatWidget({
    agentCard,
    auth,
    onMessage,
    onConnectionChange,
    onUnauthorized,
    sessionKey,
    agentUrl,
    apiKey,
    oboUserToken,
    storageConfig,
    initialContextId,
    sessionId: props.sessionId, // Pass through sessionId for multi-session mode
  });

  // Notify parent when contextId changes
  React.useEffect(() => {
    if (contextId && onContextIdChange) {
      onContextIdChange(contextId);
    }
  }, [contextId, onContextIdChange]);

  // Handlers for session title editing
  const handleStartEditTitle = useCallback(() => {
    if (onRenameSession && sessionName) {
      setEditedTitle(sessionName);
      setIsEditingTitle(true);
    }
  }, [sessionName, onRenameSession]);

  const handleSaveTitle = useCallback(() => {
    if (editedTitle.trim() && onRenameSession) {
      onRenameSession(editedTitle.trim());
      setIsEditingTitle(false);
    } else {
      // If empty, revert to original name and exit edit mode
      setEditedTitle(sessionName || '');
      setIsEditingTitle(false);
    }
  }, [editedTitle, onRenameSession, sessionName]);

  const handleCancelEdit = useCallback(() => {
    setEditedTitle(sessionName || '');
    setIsEditingTitle(false);
  }, [sessionName]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveTitle();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveTitle, handleCancelEdit]
  );

  // Default to showing logo in header if logoUrl is provided and position is not explicitly 'footer'
  const showHeaderLogo = theme?.branding?.logoUrl && theme?.branding?.logoPosition !== 'footer';
  const showFooterLogo = theme?.branding?.logoUrl && theme?.branding?.logoPosition === 'footer';

  return (
    <div className={styles.chatWindow}>
      <div className={mergeClasses(styles.header, showHeaderLogo && styles.headerWithLogo)}>
        {onToggleSidebar && (
          <Button
            appearance="subtle"
            icon={
              isSidebarCollapsed ? (
                <PanelLeftExpandRegular fontSize={20} />
              ) : (
                <PanelLeftContractRegular fontSize={20} />
              )
            }
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          />
        )}
        <div className={styles.headerContent}>
          {showHeaderLogo && <CompanyLogo branding={theme?.branding} />}
          {sessionName && onRenameSession && (
            <div className={styles.sessionInfo}>
              {isEditingTitle ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleSaveTitle}
                  autoFocus
                  size="small"
                  className={styles.sessionTitleInput}
                />
              ) : (
                <div className={styles.sessionTitleContainer}>
                  <Tooltip content="Click to edit or click the edit icon" relationship="label">
                    <span className={styles.sessionTitle} onClick={handleStartEditTitle}>
                      {sessionName}
                    </span>
                  </Tooltip>
                  <Button
                    appearance="subtle"
                    icon={<EditRegular fontSize={16} />}
                    size="small"
                    onClick={handleStartEditTitle}
                    className={styles.editButton}
                    title="Rename chat"
                  />
                </div>
              )}
            </div>
          )}
          {isConnected && (
            <div className={styles.agentInfoCompact}>
              <h3 className={styles.agentNameCompact}>{agentName}</h3>
              {agentDescription && (
                <p className={styles.agentDescriptionCompact}>{agentDescription}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.messageListContainer}>
        <MessageList
          welcomeMessage={welcomeMessage}
          agentName={agentName || 'Assistant'}
          userName={userName}
          onAuthCompleted={handleAuthCompleted}
          onAuthCanceled={handleAuthCanceled}
          sessionId={props.sessionId}
          contextId={contextId}
        />
      </div>

      {showFooterLogo && (
        <div className={styles.footer}>
          <CompanyLogo branding={theme?.branding} />
        </div>
      )}

      <div className={styles.messageInputWrapper}>
        <MessageInput
          onSendMessage={sendMessage}
          placeholder={placeholder}
          allowFileUpload={allowFileUpload}
          maxFileSize={maxFileSize}
          allowedFileTypes={allowedFileTypes}
          disabled={!isConnected}
          contextId={contextId}
          sessionId={props.sessionId}
        />
      </div>
    </div>
  );
}
