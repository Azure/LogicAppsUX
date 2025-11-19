import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@microsoft/logicAppsChat';

// Local type definitions for session metadata
export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status?: string;
  lastMessage?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export function useChatSessions() {
  // Read sessions from Zustand chatStore (server-side sessions only)
  const serverSessions = useChatStore((state) => state.sessions);

  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track recently deleted sessions to prevent them from being re-added by server sync
  const [recentlyDeletedIds, setRecentlyDeletedIds] = useState<Set<string>>(new Set());

  // Sync server sessions to local state whenever they change
  useEffect(() => {
    if (serverSessions.length > 0) {
      console.log('[useChatSessions] Server sessions changed, syncing to local state');

      // Preserve any pending sessions (not yet on server) and real sessions (if not synced yet)
      setSessions((prevSessions) => {
        const pendingSessions = prevSessions.filter((s) => s.id.startsWith('pending-'));

        // Preserve all real sessions (non-pending) that exist locally but not in serverSessions yet
        // This prevents sessions from disappearing during the race between creation and server sync
        const localRealSessions = prevSessions.filter(
          (s) => !s.id.startsWith('pending-') && !serverSessions.some((ss) => ss.id === s.id)
        );

        if (localRealSessions.length > 0) {
          console.log(
            '[useChatSessions] Preserving local real sessions not yet synced:',
            localRealSessions.map((s) => s.id)
          );
        }

        // Filter out recently deleted sessions to prevent them from being re-added
        const serverSessionsData = serverSessions
          .filter((session) => !recentlyDeletedIds.has(session.id))
          .map((session) => ({
            id: session.id,
            name: session.name || 'Untitled Chat',
            createdAt: session.createdAt.getTime(),
            updatedAt: session.updatedAt.getTime(),
            status: session.status,
            lastMessage:
              session.lastMessage?.content
                ?.map((part) => (part.type === 'text' ? part.text : ''))
                .join(' ') || '',
          }));

        // Keep local sessions (pending and newly migrated) at the top, sorted by recency
        // Then add server sessions below, also sorted by recency
        // This ensures new chats always appear at the top
        const localSessions = [...localRealSessions, ...pendingSessions].sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        const sortedServerSessions = serverSessionsData.sort((a, b) => b.updatedAt - a.updatedAt);
        const result = [...localSessions, ...sortedServerSessions];

        return result;
      });

      // Update active session if it exists and is a server session
      if (activeSessionId && !activeSessionId.startsWith('pending-')) {
        const serverSession = serverSessions.find((s) => s.id === activeSessionId);
        if (serverSession) {
          setActiveSession({
            id: serverSession.id,
            name: serverSession.name || 'Untitled Chat',
            createdAt: serverSession.createdAt.getTime(),
            updatedAt: serverSession.updatedAt.getTime(),
          });
        }
      }

      // Clean up recently deleted IDs that are confirmed not present in server sessions
      // This prevents unbounded growth of the tracking set
      if (recentlyDeletedIds.size > 0) {
        const serverSessionIds = new Set(serverSessions.map((s) => s.id));
        setRecentlyDeletedIds((prev) => {
          const updated = new Set(prev);
          for (const deletedId of prev) {
            // If the session is not in server sessions, it's been successfully archived
            // and we can stop tracking it
            if (!serverSessionIds.has(deletedId)) {
              updated.delete(deletedId);
            }
          }
          return updated;
        });
      }

      setIsLoading(false);
    } else {
      // No server sessions available - keep local sessions (both pending and real) sorted by updatedAt
      // This is important for the first chat: when migration happens from pending to real context ID,
      // we need to preserve that real session even though server hasn't been polled yet
      console.log('[useChatSessions] No server sessions available, keeping local sessions');
      setSessions((prevSessions) => {
        // Sort all local sessions by recency instead of filtering
        return [...prevSessions].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      setIsLoading(false);
    }
  }, [serverSessions, activeSessionId, recentlyDeletedIds]);

  // Auto-select first session or create one if none exist
  useEffect(() => {
    let cancelled = false;

    async function ensureActiveSession() {
      // Wait for sessions to be synced from server
      if (isLoading) return;

      // If we already have an active session, nothing to do
      if (activeSessionId) return;

      if (sessions.length > 0) {
        // Select the first session
        console.log('[useChatSessions] Auto-selecting first session:', sessions[0].id);
        const firstSessionId = sessions[0].id;
        const serverSession = serverSessions.find((s) => s.id === firstSessionId);

        if (serverSession && !cancelled) {
          setActiveSessionId(firstSessionId);
          setActiveSession({
            id: serverSession.id,
            name: serverSession.name || 'Untitled Chat',
            createdAt: serverSession.createdAt.getTime(),
            updatedAt: serverSession.updatedAt.getTime(),
          });

          // Only load messages from server if we don't already have messages in memory
          const existingMessages = useChatStore.getState().sessionMessages.get(firstSessionId);
          if (!existingMessages || existingMessages.length === 0) {
            const loadMessagesForSession = useChatStore.getState().loadMessagesForSession;
            await loadMessagesForSession(firstSessionId);
          }
        }
      }
      // No else block - sessions are only created when user clicks "New Chat" button
    }

    ensureActiveSession();

    return () => {
      cancelled = true;
    };
  }, [isLoading, sessions, activeSessionId, serverSessions]);

  // Watch for pending session migrations and update activeSessionId
  const lastMigration = useChatStore((state) => state.lastMigration);

  useEffect(() => {
    if (lastMigration && lastMigration.from === activeSessionId) {
      console.log(
        `[useChatSessions] Migration detected: ${lastMigration.from} -> ${lastMigration.to}`
      );

      // Find the pending session to preserve its name
      const pendingSession = sessions.find((s) => s.id === lastMigration.from);

      // Remove the pending session from the local sessions list and add the real session
      setSessions((prevSessions) => {
        const withoutPending = prevSessions.filter((s) => s.id !== lastMigration.from);

        // Check if real session already exists in the list
        const hasRealSession = withoutPending.some((s) => s.id === lastMigration.to);
        if (hasRealSession) {
          return withoutPending;
        }

        // Create a local session with the real context ID
        // The server created this session, we just haven't polled for it yet
        // Preserve custom name if user renamed the pending session, otherwise use context ID
        const hasCustomName = pendingSession?.name && pendingSession.name !== 'New Chat';
        const realSessionData: SessionMetadata = {
          id: lastMigration.to,
          name: hasCustomName
            ? pendingSession!.name
            : lastMigration.suggestedName || lastMigration.to,
          createdAt: pendingSession?.createdAt || Date.now(),
          updatedAt: Date.now(),
          status: 'Running', // Match server convention for active chats
          lastMessage: '',
        };

        return [realSessionData, ...withoutPending];
      });

      // Update active session to the new real context ID
      setActiveSessionId(lastMigration.to);

      // Try to find the real session in serverSessions, otherwise use local data
      const realSession = serverSessions.find((s) => s.id === lastMigration.to);
      if (realSession) {
        setActiveSession({
          id: realSession.id,
          name: realSession.name || 'Untitled Chat',
          createdAt: realSession.createdAt.getTime(),
          updatedAt: realSession.updatedAt.getTime(),
        });
      } else {
        // Use local session data until server sync happens
        // Preserve custom name if user renamed the pending session, otherwise use context ID
        const hasCustomName = pendingSession?.name && pendingSession.name !== 'New Chat';
        setActiveSession({
          id: lastMigration.to,
          name: hasCustomName
            ? pendingSession!.name
            : lastMigration.suggestedName || lastMigration.to,
          createdAt: pendingSession?.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      }

      // If the pending session had a custom name, update it on the server
      // Migration is guaranteed to be complete when lastMigration is set
      if (pendingSession?.name && pendingSession.name !== 'New Chat') {
        console.log(
          `[useChatSessions] Pending session had custom name "${pendingSession.name}", updating on server`
        );
        (async () => {
          try {
            const chatStoreRenameSession = useChatStore.getState().renameSession;
            await chatStoreRenameSession(lastMigration.to, pendingSession.name);
          } catch (error) {
            console.error('[useChatSessions] Error renaming migrated session on server:', error);
          }
        })();
      }

      // Clear the migration state to prevent re-triggering
      useChatStore.setState({ lastMigration: null });
    }
  }, [lastMigration, activeSessionId, serverSessions, sessions]);

  const switchSession = useCallback(
    async (sessionId: string) => {
      try {
        setActiveSessionId(sessionId);

        // Check if this is a pending session (doesn't exist on server yet)
        const isPendingSession = sessionId.startsWith('pending-');

        if (isPendingSession) {
          console.log('[useChatSessions] Switching to pending session:', sessionId);
          setActiveSession({
            id: sessionId,
            name: 'New Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          // Don't try to load messages from server for pending sessions
          return;
        }

        const serverSession = serverSessions.find((s) => s.id === sessionId);
        if (serverSession) {
          console.log('[useChatSessions] Switching to server session:', sessionId);
          setActiveSession({
            id: serverSession.id,
            name: serverSession.name || 'Untitled Chat',
            createdAt: serverSession.createdAt.getTime(),
            updatedAt: serverSession.updatedAt.getTime(),
          });

          // Only load messages from server if we don't already have messages in memory
          const existingMessages = useChatStore.getState().sessionMessages.get(sessionId);
          if (!existingMessages || existingMessages.length === 0) {
            console.log('[useChatSessions] No messages in memory, loading from server');
            const loadMessagesForSession = useChatStore.getState().loadMessagesForSession;
            await loadMessagesForSession(sessionId);
          } else {
            console.log('[useChatSessions] Messages already in memory, skipping server load');
          }
        }
      } catch (error) {
        console.error('[useChatSessions] Error switching session:', error);
      }
    },
    [serverSessions]
  );

  const createNewSession = useCallback(
    async (name?: string) => {
      try {
        console.log('[useChatSessions] Creating new pending session (local only)...');

        // Create a purely local pending session - don't call storage yet
        // The real session will be created on the server when the first message is sent
        const pendingSessionId = `pending-${Date.now()}`;
        const now = Date.now();

        const newSessionMetadata: SessionMetadata = {
          id: pendingSessionId,
          name: name || 'New Chat',
          createdAt: now,
          updatedAt: now,
          status: 'Running', // Match server convention for active chats
          lastMessage: '',
        };

        console.log('[useChatSessions] Local pending session created:', pendingSessionId);

        // Add the pending session to the sessions list
        setSessions((prev) => [newSessionMetadata, ...prev]);

        // Switch to the new session
        await switchSession(pendingSessionId);

        return {
          id: pendingSessionId,
          name: name || 'New Chat',
          createdAt: now,
          updatedAt: now,
        };
      } catch (error) {
        console.error('[useChatSessions] Error creating session:', error);
        throw error;
      }
    },
    [switchSession]
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      try {
        // Check if this is a pending session (local only)
        const isPendingSession = sessionId.startsWith('pending-');

        if (isPendingSession) {
          console.log('[useChatSessions] Renaming pending session locally:', sessionId);
          // Update local state only - no server call
          setSessions((prev) =>
            prev.map((session) =>
              session.id === sessionId
                ? { ...session, name: newName, updatedAt: Date.now() }
                : session
            )
          );

          // Update active session if it's the one being renamed
          if (activeSessionId === sessionId) {
            setActiveSession((prev) =>
              prev ? { ...prev, name: newName, updatedAt: Date.now() } : prev
            );
          }
        } else {
          console.log('[useChatSessions] Renaming server session:', sessionId);

          // Optimistically update local state immediately for instant UI feedback
          setSessions((prev) =>
            prev.map((session) =>
              session.id === sessionId
                ? { ...session, name: newName, updatedAt: Date.now() }
                : session
            )
          );

          // Update active session if it's the one being renamed
          if (activeSessionId === sessionId) {
            setActiveSession((prev) =>
              prev ? { ...prev, name: newName, updatedAt: Date.now() } : prev
            );
          }

          // Then update the server - server sync will confirm the change later
          const chatStoreRenameSession = useChatStore.getState().renameSession;
          await chatStoreRenameSession(sessionId, newName);
        }
      } catch (error) {
        console.error('[useChatSessions] Error renaming session:', error);
      }
    },
    [activeSessionId]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        console.log('[useChatSessions] Deleting (archiving) server session:', sessionId);

        // Add to recently deleted IDs to prevent re-adding from server sync
        setRecentlyDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(sessionId);
          return next;
        });

        // Optimistically remove from local state immediately for instant UI feedback
        setSessions((prevSessions) => prevSessions.filter((s) => s.id !== sessionId));

        // If we deleted the active session, switch to another one
        if (sessionId === activeSessionId) {
          const remainingSessions = serverSessions.filter((s) => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            await switchSession(remainingSessions[0].id);
          } else {
            // No sessions left
            setActiveSessionId(null);
            setActiveSession(null);
          }
        }

        // Then update the server - server sync will confirm the change later
        const chatStoreDeleteSession = useChatStore.getState().deleteSession;
        await chatStoreDeleteSession(sessionId);
      } catch (error) {
        console.error('[useChatSessions] Error deleting session:', error);
      }
    },
    [serverSessions, activeSessionId, switchSession]
  );

  const refreshSessions = useCallback(async () => {
    try {
      const chatStoreLoadSessions = useChatStore.getState().loadSessions;
      await chatStoreLoadSessions();
    } catch (error) {
      console.error('[useChatSessions] Error refreshing sessions:', error);
    }
  }, []);

  return {
    sessions,
    activeSessionId,
    activeSession,
    createNewSession,
    switchSession,
    renameSession,
    deleteSession,
    refreshSessions,
    isLoading,
  };
}
