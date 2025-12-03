import type React from 'react';
import { useState, useCallback, memo } from 'react';
import { Button, Body1, mergeClasses } from '@fluentui/react-components';
import { AddFilled } from '@fluentui/react-icons';
import type { SessionMetadata } from '../../hooks/useChatSessions';
import type { ChatTheme } from '@microsoft/logicAppsChat';
import { useChatStore } from '@microsoft/logicAppsChat';
import { useSessionListStyles } from './SessionListStyles';
import SessionItem from './SessionItem';

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
    const styles = useSessionListStyles();
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

      if (diffMins < 1) {
        return 'Just now';
      }
      if (diffMins < 60) {
        return `${diffMins}m ago`;
      }
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }

      return date.toLocaleDateString();
    }, []);

    // Ensure sessions is an array
    const safeSessions = Array.isArray(sessions) ? sessions : [];

    // Apply theme colors if provided
    const themeStyle = themeColors
      ? ({
          '--theme-primary': themeColors.primary,
          '--theme-primary-hover': `${themeColors.primary}dd`,
        } as React.CSSProperties)
      : {};

    return (
      <div className={styles.sessionList} style={themeStyle}>
        <div className={styles.header}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Company Logo"
              className={mergeClasses(styles.logo, logoSize === 'small' && styles.logoSmall, logoSize === 'large' && styles.logoLarge)}
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
                    e.currentTarget.style.backgroundColor = `${themeColors.primary}dd`;
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
              icon={<AddFilled fontSize={16} />}
              onClick={onNewSession}
              size="medium"
              title="New chat"
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
                  e.currentTarget.style.backgroundColor = `${themeColors.primary}dd`;
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (themeColors) {
                  e.currentTarget.style.backgroundColor = themeColors.primary;
                }
              }}
            >
              New chat
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

SessionList.displayName = 'SessionList';
