import React, { useState, useCallback, memo } from 'react';
import {
  Button,
  Card,
  Text,
  Caption1,
  Body1,
  Input,
  makeStyles,
  shorthands,
  tokens,
  mergeClasses,
  Tooltip,
} from '@fluentui/react-components';
import { AddRegular, EditRegular, ArchiveRegular, WarningRegular } from '@fluentui/react-icons';
import type { SessionMetadata } from '../hooks/useChatSessions';
import type { ChatTheme } from '@microsoft/logicAppsChat';
import { useChatStore } from '@microsoft/logicAppsChat';

const useStyles = makeStyles({
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
  header: {
    height: '60px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  logo: {
    height: '32px',
    width: 'auto',
    objectFit: 'contain' as const,
    maxWidth: '120px',
  },
  logoSmall: {
    height: '24px',
    maxWidth: '100px',
  },
  logoLarge: {
    height: '40px',
    maxWidth: '150px',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    paddingTop: `calc(${tokens.spacingVerticalM} + 8px)`,
    paddingBottom: `calc(${tokens.spacingVerticalM} + 8px)`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke1),
  },
  buttonWrapper: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  sessions: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  sessionItem: {
    marginBottom: tokens.spacingVerticalS,
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    transition: 'all 0.2s ease',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1Hover),
    },
  },
  sessionItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    },
  },
  sessionContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    flex: 1,
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionName: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    cursor: 'pointer',
    ':hover': {
      textDecoration: 'underline',
      textDecorationColor: tokens.colorNeutralForeground3,
      textUnderlineOffset: '2px',
    },
  },
  lastMessage: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionTime: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4,
  },
  sessionActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  sessionActionsHidden: {
    opacity: 0.4,
    transition: 'opacity 0.2s ease',
  },
  sessionItemWrapper: {
    ':hover .session-actions': {
      opacity: 1,
    },
  },
  editInput: {
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    textAlign: 'center',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  emptyStateText: {
    color: tokens.colorNeutralForeground3,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    ...shorthands.borderRadius('50%'),
    flexShrink: 0,
  },
  statusBadgeFailed: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  statusBadgeOther: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  sessionItemDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1,
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    },
  },
  typingIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('3px'),
  },
  typingDot: {
    width: '4px',
    height: '4px',
    ...shorthands.borderRadius('50%'),
    backgroundColor: tokens.colorBrandForeground1,
    animationName: {
      from: { opacity: 0.3, transform: 'scale(0.8)' },
      to: { opacity: 1, transform: 'scale(1)' },
    },
    animationDuration: '1s',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
  },
  typingDot2: {
    animationDelay: '0.2s',
  },
  typingDot3: {
    animationDelay: '0.4s',
  },
  unreadBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    ...shorthands.padding('2px', '6px'),
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    backgroundColor: tokens.colorBrandBackground,
    color: '#fff',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    marginLeft: 'auto',
  },
});

interface SessionListProps {
  sessions: SessionMetadata[];
  activeSessionId: string | null;
  onSessionClick: (sessionId: string) => void | Promise<void>;
  onNewSession: () => void | Promise<void>;
  onRenameSession: (sessionId: string, newName: string) => void | Promise<void>;
  /** Archives the session (sets IsArchived=true), does not permanently delete */
  onDeleteSession: (sessionId: string) => void | Promise<void>;
  logoUrl?: string;
  logoSize?: 'small' | 'medium' | 'large';
  themeColors?: ChatTheme['colors'];
}

// Memoized session item component to prevent unnecessary re-renders
interface SessionItemProps {
  session: SessionMetadata;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSessionClick: (sessionId: string) => void;
  onStartEdit: (sessionId: string, currentName: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  formatDate: (timestamp: number) => string;
  themeColors?: ChatTheme['colors'];
  status?: string;
  isTyping?: boolean;
  unreadCount?: number;
}

const SessionItem = memo(
  ({
    session,
    isActive,
    isEditing,
    editName,
    onSessionClick,
    onStartEdit,
    onDeleteSession,
    onEditNameChange,
    onSaveEdit,
    onKeyDown,
    formatDate,
    themeColors,
    status,
    isTyping = false,
    unreadCount = 0,
  }: SessionItemProps) => {
    const styles = useStyles();

    // Failed sessions can be viewed (to see history) but not edited
    const isFailed = status === 'Failed';
    const canEdit = status === 'Running' || !status; // Only Running sessions can be edited
    const canDelete = true; // Allow archiving any session for cleanup

    const handleClick = useCallback(() => {
      // Allow viewing all sessions, including failed ones
      onSessionClick(session.id);
    }, [onSessionClick, session.id]);

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        // Prevent editing failed/unavailable sessions
        if (!canEdit) {
          return;
        }
        onStartEdit(session.id, session.name || 'Untitled Chat');
      },
      [onStartEdit, session.id, session.name, canEdit]
    );

    const handleStartEdit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        // Prevent editing failed/unavailable sessions
        if (!canEdit) {
          return;
        }
        onStartEdit(session.id, session.name || 'Untitled Chat');
      },
      [onStartEdit, session.id, session.name, canEdit]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        // Allow archiving all sessions for cleanup
        if (!canDelete) {
          return;
        }
        const confirmMessage = isFailed
          ? 'Archive this failed chat? You can view archived chats later if needed.'
          : 'Archive this chat? You can view archived chats later if needed.';
        if (confirm(confirmMessage)) {
          onDeleteSession(session.id);
        }
      },
      [onDeleteSession, session.id, canDelete, isFailed]
    );

    const handleEditChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onEditNameChange(e.target.value);
      },
      [onEditNameChange]
    );

    const handleEditClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    // Apply theme colors to active session
    const activeStyle =
      isActive && themeColors
        ? {
            backgroundColor: themeColors.primary + '15',
            borderColor: themeColors.primary,
          }
        : {};

    // Render status badge - only show for non-Running statuses
    const renderStatusBadge = () => {
      // Don't show badge for Running, active, missing status, or pending sessions
      if (
        !status ||
        status === 'Running' ||
        status === 'active' ||
        session.id.startsWith('pending-')
      )
        return null;

      const statusIcon = isFailed ? (
        <WarningRegular fontSize={14} />
      ) : (
        <WarningRegular fontSize={14} />
      );

      const statusClass = isFailed ? styles.statusBadgeFailed : styles.statusBadgeOther;

      const statusTooltip = isFailed
        ? 'Chat failed - You can view history but cannot send new messages'
        : `Chat status: ${status}`;

      return (
        <Tooltip content={statusTooltip} relationship="label">
          <div className={mergeClasses(styles.statusBadge, statusClass)}>{statusIcon}</div>
        </Tooltip>
      );
    };

    return (
      <div className={styles.sessionItemWrapper}>
        <Card
          className={mergeClasses(styles.sessionItem, isActive && styles.sessionItemActive)}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          appearance="subtle"
          style={activeStyle}
        >
          <div className={styles.sessionContent}>
            {isEditing ? (
              <Input
                value={editName}
                onChange={handleEditChange}
                onKeyDown={onKeyDown}
                onBlur={onSaveEdit}
                onClick={handleEditClick}
                autoFocus
                className={styles.editInput}
                size="small"
              />
            ) : (
              <>
                <div className={styles.sessionHeader}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {renderStatusBadge()}
                    <Tooltip
                      content="Click edit icon or double-click to rename"
                      relationship="label"
                    >
                      <Text className={styles.sessionName}>{session.name || 'Untitled Chat'}</Text>
                    </Tooltip>
                  </div>
                  {unreadCount > 0 && !isActive && !isTyping && (
                    <div className={styles.unreadBadge}>{unreadCount}</div>
                  )}
                  <div
                    className={mergeClasses(
                      styles.sessionActions,
                      styles.sessionActionsHidden,
                      'session-actions'
                    )}
                  >
                    <Tooltip
                      content={canEdit ? 'Rename chat' : 'Cannot rename failed chat'}
                      relationship="label"
                    >
                      <Button
                        appearance="subtle"
                        icon={<EditRegular />}
                        size="small"
                        onClick={handleStartEdit}
                        title="Rename"
                        disabled={!canEdit}
                      />
                    </Tooltip>
                    <Tooltip
                      content={isFailed ? 'Archive failed chat' : 'Archive chat'}
                      relationship="label"
                    >
                      <Button
                        appearance="subtle"
                        icon={<ArchiveRegular />}
                        size="small"
                        onClick={handleDelete}
                        title="Archive"
                        disabled={!canDelete}
                      />
                    </Tooltip>
                  </div>
                </div>
                {session.lastMessage && (
                  <Caption1 className={styles.lastMessage}>{session.lastMessage}</Caption1>
                )}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Caption1 className={styles.sessionTime}>
                    {formatDate(session.updatedAt || Date.now())}
                  </Caption1>
                  {isTyping && (
                    <div className={styles.typingIndicator}>
                      <div className={styles.typingDot} />
                      <div className={mergeClasses(styles.typingDot, styles.typingDot2)} />
                      <div className={mergeClasses(styles.typingDot, styles.typingDot3)} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }
);

export const SessionList = memo(
  ({
    sessions,
    activeSessionId,
    onSessionClick,
    onNewSession,
    onRenameSession,
    onDeleteSession,
    logoUrl,
    logoSize = 'medium',
    themeColors,
  }: SessionListProps) => {
    const styles = useStyles();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Read typing state and unread counts from store
    const typingByContext = useChatStore((state) => state.typingByContext);
    const unreadCounts = useChatStore((state) => state.unreadCounts);

    const handleStartEdit = useCallback((sessionId: string, currentName: string) => {
      setEditingSessionId(sessionId);
      setEditName(currentName);
    }, []);

    const handleSaveEdit = useCallback(() => {
      if (editingSessionId && editName.trim()) {
        onRenameSession(editingSessionId, editName.trim());
        setEditingSessionId(null);
        setEditName('');
      }
    }, [editingSessionId, editName, onRenameSession]);

    const handleCancelEdit = useCallback(() => {
      setEditingSessionId(null);
      setEditName('');
    }, []);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          handleSaveEdit();
        } else if (e.key === 'Escape') {
          handleCancelEdit();
        }
      },
      [handleSaveEdit, handleCancelEdit]
    );

    const handleEditNameChange = useCallback((name: string) => {
      setEditName(name);
    }, []);

    // Memoize the format date function to avoid recreating it
    const formatDate = useCallback((timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    }, []);

    // Ensure sessions is an array
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    // Apply theme colors if provided
    const themeStyle = themeColors
      ? ({
          '--theme-primary': themeColors.primary,
          '--theme-primary-hover': themeColors.primary + 'dd',
        } as React.CSSProperties)
      : {};

    return (
      <div className={styles.sessionList} style={themeStyle}>
        <div className={styles.header}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Company Logo"
              className={mergeClasses(
                styles.logo,
                logoSize === 'small' && styles.logoSmall,
                logoSize === 'large' && styles.logoLarge
              )}
            />
          )}
          <h3 className={styles.title}>Chats</h3>
        </div>
        <div className={styles.sessions}>
          {safeSessions.length === 0 ? (
            <div className={styles.emptyState}>
              <Body1 className={styles.emptyStateText}>No chats yet</Body1>
              <Button
                appearance="primary"
                onClick={onNewSession}
                style={
                  themeColors
                    ? {
                        backgroundColor: themeColors.primary,
                        color: themeColors.primaryText || '#fff',
                        border: 'none',
                      }
                    : {}
                }
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (themeColors) {
                    e.currentTarget.style.backgroundColor = themeColors.primary + 'dd';
                  }
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (themeColors) {
                    e.currentTarget.style.backgroundColor = themeColors.primary;
                  }
                }}
              >
                Start a new chat
              </Button>
            </div>
          ) : (
            safeSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                isEditing={editingSessionId === session.id}
                editName={editName}
                onSessionClick={onSessionClick}
                onStartEdit={handleStartEdit}
                onDeleteSession={onDeleteSession}
                onEditNameChange={handleEditNameChange}
                onSaveEdit={handleSaveEdit}
                onKeyDown={handleKeyDown}
                formatDate={formatDate}
                themeColors={themeColors}
                status={session.status}
                isTyping={typingByContext.get(session.id) || false}
                unreadCount={unreadCounts.get(session.id) || 0}
              />
            ))
          )}
        </div>
        <div className={styles.footer}>
          <div className={styles.buttonWrapper}>
            <Button
              appearance="primary"
              icon={<AddRegular fontSize={16} />}
              onClick={onNewSession}
              size="medium"
              title="New Chat"
              style={{
                width: '100%',
                minHeight: '40px',
                height: '40px',
                ...(themeColors && {
                  backgroundColor: themeColors.primary,
                  color: themeColors.primaryText || '#fff',
                  border: 'none',
                }),
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (themeColors) {
                  e.currentTarget.style.backgroundColor = themeColors.primary + 'dd';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (themeColors) {
                  e.currentTarget.style.backgroundColor = themeColors.primary;
                }
              }}
            >
              New Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }
);
