# Graph Report - src  (2026-08-26)

## Corpus Check
- 141 files · ~80,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 796 nodes · 2100 edges · 44 communities (37 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c7453c9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- history-types.ts
- schemas.ts
- src/react/store/chatStore.ts
- MockSSEClient
- plugins/index.ts
- SessionManager
- react/components/Message/Message.tsx
- ChatInterface
- SSEClient
- A2A Chat React Components
- DataTransferPolyfill
- MockSSEClient
- react/components/FileUpload/FileUpload.tsx
- src/react/components/Message/Message.tsx
- errors.ts
- AuthRequiredPart
- src/react/utils/messageUtils.ts
- react/index.ts
- src/react/types/index.ts
- src/react/components/ChatWindow/ChatWindow.tsx
- DataTransferPolyfill
- react/types/index.ts
- MockSSEClient
- MockSSEClient
- src/react/components/FileUpload/FileUpload.tsx
- useChatStore
- integrated-auth-ui.tsx

## God Nodes (most connected - your core abstractions)
1. `AgentCard` - 44 edges
2. `A2AClient` - 31 edges
3. `SessionManager` - 29 edges
4. `useChatStore` - 27 edges
5. `ChatSession` - 26 edges
6. `HttpClient` - 25 edges
7. `AuthConfig` - 25 edges
8. `ChatInterface` - 23 edges
9. `SSEClient` - 21 edges
10. `Message` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ChatState` --references--> `ChatSession`  [EXTRACTED]
  react/store/chatStore.ts → src/api/history-types.ts
- `ChatState` --references--> `A2AClient`  [EXTRACTED]
  react/store/chatStore.ts → src/client/a2a-client.ts
- `AgentConfig` --references--> `AuthConfig`  [EXTRACTED]
  react/types/index.ts → src/client/types.ts
- `AuthPartState` --inherits--> `AuthRequiredPart`  [EXTRACTED]
  react/components/Message/AuthenticationMessage.tsx → src/client/types.ts
- `Message` --references--> `AuthRequiredPart`  [EXTRACTED]
  react/types/index.ts → src/client/types.ts

## Import Cycles
- 3-file cycle: `src/react/store/chatStore.ts -> src/react/types/index.ts -> src/react/use-a2a.ts -> src/react/store/chatStore.ts`
- 4-file cycle: `src/react/store/chatStore.ts -> src/react/utils/message-transformer.ts -> src/react/types/index.ts -> src/react/use-a2a.ts -> src/react/store/chatStore.ts`

## Communities (44 total, 7 thin omitted)

### Community 0 - "history-types.ts"
Cohesion: 0.07
Nodes (43): createHistoryApi(), HistoryApi, HistoryApiClient, HistoryApiConfig, JsonRpcRequest, IMPORTANT: The method name is "context/update" (singular), not "contexts/update", extractAuthEventFromMessage(), extractLastMessage() (+35 more)

### Community 1 - "schemas.ts"
Cohesion: 0.05
Nodes (54): A2AClient, mockAgentCard, mockAgentCard, WaitForCompletionOptions, mockAgentCard, AgentDiscovery, AgentDiscoveryOptions, CacheEntry (+46 more)

### Community 2 - "src/react/store/chatStore.ts"
Cohesion: 0.07
Nodes (38): Message, A2AClientConfig, HttpClient, AuthConfig, AuthRequiredEvent, AuthRequiredHandler, HttpClientOptions, IdentityProvider (+30 more)

### Community 4 - "plugins/index.ts"
Cohesion: 0.08
Nodes (18): AnalyticsConfig, AnalyticsEvent, AnalyticsPlugin, LoggerConfig, LoggerPlugin, LogLevel, AnalyticsConfig, AnalyticsEvent (+10 more)

### Community 5 - "SessionManager"
Cohesion: 0.10
Nodes (10): LocalStoragePlugin, SessionManager, mockLocalStorage, mockSessionStorage, SessionChangeEvent, SessionData, SessionEventMap, SessionOptions (+2 more)

### Community 6 - "react/components/Message/Message.tsx"
Cohesion: 0.09
Nodes (22): CodeBlockHeader(), CodeBlockHeaderProps, useStyles, escapeAttr(), formatTime(), link(), Message, MessageComponent() (+14 more)

### Community 7 - "ChatInterface"
Cohesion: 0.17
Nodes (10): ChatInterface, ChatInterfaceConfig, ChatEventMap, ChatMessage, ChatOptions, ChatRole, ConversationExport, StreamUpdate (+2 more)

### Community 8 - "SSEClient"
Cohesion: 0.17
Nodes (7): SSEClient, MockEventSource, ErrorHandler, MessageHandler, SSEClientOptions, SSEMessage, SSEParser

### Community 9 - "A2A Chat React Components"
Cohesion: 0.17
Nodes (11): A2A Chat React Components, Components, Features, Hooks, Important: CSS Import Required, Main Component, State Management, TypeScript Support (+3 more)

### Community 21 - "src/react/components/Message/Message.tsx"
Cohesion: 0.10
Nodes (20): CodeBlockHeader(), CodeBlockHeaderProps, useStyles, escapeAttr(), formatFileSize(), formatTime(), link(), Message (+12 more)

### Community 22 - "errors.ts"
Cohesion: 0.13
Nodes (16): formatErrorMessage(), getUserFriendlyErrorMessage(), A2AError, AuthenticationError, createJsonRpcError(), extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorCode (+8 more)

### Community 23 - "AuthRequiredPart"
Cohesion: 0.15
Nodes (19): AuthRequiredPart, ExampleWithHooks(), manualAuthFlow(), AuthenticationMessage(), AuthenticationMessageProps, AuthPartState, useStyles, AuthenticationMessage() (+11 more)

### Community 24 - "src/react/utils/messageUtils.ts"
Cohesion: 0.19
Nodes (14): MessageInput(), MessageInputProps, useStyles, StatusMessage(), StatusMessageProps, useStyles, Attachment, ArtifactData (+6 more)

### Community 25 - "react/index.ts"
Cohesion: 0.24
Nodes (13): ChatWidget(), useStyles, ChatThemeProvider(), ChatThemeProviderProps, adjustBrightness(), createCustomTheme(), defaultBrandColors, defaultDarkTheme (+5 more)

### Community 26 - "src/react/types/index.ts"
Cohesion: 0.23
Nodes (10): CompanyLogo(), CompanyLogoProps, AgentConfig, AttachmentStatus, Branding, ChatConfig, ChatTheme, FileAttachment (+2 more)

### Community 27 - "src/react/components/ChatWindow/ChatWindow.tsx"
Cohesion: 0.25
Nodes (8): ChatWindow(), ChatWindowProps, useStyles, mockUseChatWidget, applyTheme(), DEFAULT_THEME, mergeTheme(), useTheme()

### Community 29 - "react/types/index.ts"
Cohesion: 0.25
Nodes (7): AgentConfig, AttachmentStatus, Branding, ChatConfig, FileAttachment, MessageRole, MessageStatus

### Community 32 - "src/react/components/FileUpload/FileUpload.tsx"
Cohesion: 0.53
Nodes (3): FileUpload(), FileUploadProps, formatFileSize()

### Community 33 - "useChatStore"
Cohesion: 0.17
Nodes (15): MessageInput(), MessageInputProps, useStyles, StatusMessage(), StatusMessageProps, useStyles, useChatStore, Attachment (+7 more)

### Community 36 - "integrated-auth-ui.tsx"
Cohesion: 0.08
Nodes (26): ChatWidget(), useStyles, ChatWindow(), ChatWindowProps, useStyles, CompanyLogo(), CompanyLogoProps, AuthStateExample() (+18 more)

## Knowledge Gaps
- **60 isolated node(s):** `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard`, `mockAgentCard`, `mockUseChatWidget` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Message` connect `react/components/Message/Message.tsx` to `schemas.ts`, `src/react/store/chatStore.ts`, `useChatStore`, `plugins/index.ts`, `ChatInterface`, `AuthRequiredPart`, `react/index.ts`, `react/types/index.ts`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `AgentCard` connect `schemas.ts` to `react/index.ts`, `src/react/store/chatStore.ts`, `src/react/types/index.ts`, `react/types/index.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `A2AClient` connect `schemas.ts` to `src/react/store/chatStore.ts`, `AuthRequiredPart`, `plugins/index.ts`, `ChatInterface`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useChatStore` (e.g. with `.addMessage()` and `.clear()`) actually correct?**
  _`useChatStore` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history-types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06771929824561404 - nodes in this community are weakly interconnected._
- **Should `schemas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0503030303030303 - nodes in this community are weakly interconnected._