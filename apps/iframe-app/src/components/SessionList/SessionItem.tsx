import type React from 'react';
import { useCallback, memo } from 'react';
import { Button, Card, Text, Caption1, Input, mergeClasses, Tooltip } from '@fluentui/react-components';
import { EditRegular, ArchiveRegular, WarningRegular } from '@fluentui/react-icons';
import type { SessionMetadata } from '../../hooks/useChatSessions';
import type { ChatTheme } from '@microsoft/logic-apps-chat';
import { useSessionListStyles } from './SessionListStyles';

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
    const styles = useSessionListStyles();

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
            backgroundColor: `${themeColors.primary}15`,
            borderColor: themeColors.primary,
          }
        : {};

    // Render status badge - only show for non-Running statuses
    const renderStatusBadge = () => {
      // Don't show badge for Running, active, missing status, or pending sessions
      if (!status || status === 'Running' || status === 'active' || session.id.startsWith('pending-')) {
        return null;
      }

      const statusIcon = isFailed ? <WarningRegular fontSize={14} /> : <WarningRegular fontSize={14} />;

      const statusClass = isFailed ? styles.statusBadgeFailed : styles.statusBadgeOther;

      const statusTooltip = isFailed ? 'Chat failed - You can view history but cannot send new messages' : `Chat status: ${status}`;

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
                    <Tooltip content="Click edit icon or double-click to rename" relationship="label">
                      <Text className={styles.sessionName}>{session.name || 'Untitled Chat'}</Text>
                    </Tooltip>
                  </div>
                  {unreadCount > 0 && !isActive && !isTyping && <div className={styles.unreadBadge}>{unreadCount}</div>}
                  <div className={mergeClasses(styles.sessionActions, styles.sessionActionsHidden, 'session-actions')}>
                    <Tooltip content={canEdit ? 'Rename chat' : 'Cannot rename failed chat'} relationship="label">
                      <Button
                        appearance="subtle"
                        icon={<EditRegular />}
                        size="small"
                        onClick={handleStartEdit}
                        title="Rename"
                        disabled={!canEdit}
                      />
                    </Tooltip>
                    <Tooltip content={isFailed ? 'Archive failed chat' : 'Archive chat'} relationship="label">
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
                {session.lastMessage && <Caption1 className={styles.lastMessage}>{session.lastMessage}</Caption1>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Caption1 className={styles.sessionTime}>{formatDate(session.updatedAt || Date.now())}</Caption1>
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

SessionItem.displayName = 'SessionItem';
export default SessionItem;
