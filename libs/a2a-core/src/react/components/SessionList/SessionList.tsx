import React, { useState, useCallback } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Button,
  Input,
  Spinner,
  mergeClasses,
} from '@fluentui/react-components';
import { AddRegular, DeleteRegular, EditRegular, ChatRegular } from '@fluentui/react-icons';
import type { ChatSession } from '../../../api/history-types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  newChatButton: {
    width: '100%',
  },
  sessionsList: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS, 0),
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    cursor: 'pointer',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    position: 'relative',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  sessionItemSelected: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  sessionIcon: {
    marginRight: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  sessionContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXXS),
  },
  sessionName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionPreview: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionDate: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
  },
  sessionActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    opacity: 0,
    transition: 'opacity 0.2s',
    marginLeft: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  sessionItemHovered: {
    '& $sessionActions': {
      opacity: 1,
    },
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXXL),
    ...shorthands.gap(tokens.spacingVerticalM),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL),
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    ...shorthands.gap(tokens.spacingVerticalM),
    color: tokens.colorPaletteRedForeground1,
  },
  nameInput: {
    width: '100%',
  },
});

export type SessionListProps = {
  sessions: ChatSession[];
  currentSessionId?: string | null;
  loading?: boolean;
  error?: string | null;
  onSessionClick: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onRetry?: () => void;
};

export function SessionList(props: SessionListProps) {
  const {
    sessions,
    currentSessionId,
    loading,
    error,
    onSessionClick,
    onNewSession,
    onDeleteSession,
    onRenameSession,
    onRetry,
  } = props;

  const styles = useStyles();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const handleStartRename = useCallback((session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditedName(session.name);
  }, []);

  const handleSaveRename = useCallback(() => {
    if (editingSessionId && editedName.trim()) {
      onRenameSession(editingSessionId, editedName.trim());
    }
    setEditingSessionId(null);
    setEditedName('');
  }, [editingSessionId, editedName, onRenameSession]);

  const handleCancelRename = useCallback(() => {
    setEditingSessionId(null);
    setEditedName('');
  }, []);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveRename();
      } else if (e.key === 'Escape') {
        handleCancelRename();
      }
    },
    [handleSaveRename, handleCancelRename]
  );

  const handleDelete = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteSession(sessionId);
    },
    [onDeleteSession]
  );

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (session: ChatSession): string => {
    if (!session.lastMessage) return '';

    const textParts = session.lastMessage.content.filter((c) => c.type === 'text');
    if (textParts.length === 0) return '';

    const firstText = textParts[0];
    if (firstText.type === 'text') {
      return firstText.text.substring(0, 60) + (firstText.text.length > 60 ? '...' : '');
    }

    return '';
  };

  // Sort sessions by updatedAt descending
  const sortedSessions = [...sessions].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={onNewSession}
            className={styles.newChatButton}
            disabled
          >
            New Chat
          </Button>
        </div>
        <div className={styles.loadingState}>
          <Spinner label="Loading..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={onNewSession}
            className={styles.newChatButton}
          >
            New Chat
          </Button>
        </div>
        <div className={styles.errorState}>
          <p>{error}</p>
          {onRetry && (
            <Button appearance="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          appearance="primary"
          icon={<AddRegular />}
          onClick={onNewSession}
          className={styles.newChatButton}
        >
          New Chat
        </Button>
      </div>

      <div className={styles.sessionsList} role="list">
        {sortedSessions.length === 0 ? (
          <div className={styles.emptyState}>
            <ChatRegular fontSize={48} />
            <p>No chats yet</p>
            <p>Start a new conversation</p>
          </div>
        ) : (
          sortedSessions.map((session) => (
            <div
              key={session.id}
              role="listitem"
              className={mergeClasses(
                styles.sessionItem,
                session.id === currentSessionId && styles.sessionItemSelected,
                hoveredSessionId === session.id && styles.sessionItemHovered
              )}
              onClick={() => onSessionClick(session.id)}
              onMouseEnter={() => setHoveredSessionId(session.id)}
              onMouseLeave={() => setHoveredSessionId(null)}
            >
              <ChatRegular className={styles.sessionIcon} />
              <div className={styles.sessionContent}>
                {editingSessionId === session.id ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleRenameKeyDown}
                    onBlur={handleSaveRename}
                    autoFocus
                    size="small"
                    className={styles.nameInput}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className={styles.sessionName}>{session.name}</div>
                    {getLastMessagePreview(session) && (
                      <div className={styles.sessionPreview}>{getLastMessagePreview(session)}</div>
                    )}
                    <div className={styles.sessionDate}>{formatDate(session.updatedAt)}</div>
                  </>
                )}
              </div>
              {hoveredSessionId === session.id && editingSessionId !== session.id && (
                <div className={styles.sessionActions}>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<EditRegular />}
                    onClick={(e: React.MouseEvent) => handleStartRename(session, e)}
                    title="Rename"
                  />
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<DeleteRegular />}
                    onClick={(e: React.MouseEvent) => handleDelete(session.id, e)}
                    title="Delete"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
