# Graph Report - src  (2026-09-13)

## Corpus Check
- 141 files · ~80,919 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 796 nodes · 2115 edges · 40 communities (18 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f1dec486`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- history-types.ts
- errors.ts
- a2a-client.ts
- agent-discovery.ts
- plugins/index.ts
- SessionManager
- react/components/Message/Message.tsx
- ChatInterface
- SSEClient
- A2A Chat React Components
- DataTransferPolyfill
- MockSSEClient
- src/react/types/index.ts
- AuthRequiredPart
- src/react/utils/messageUtils.ts
- schemas.ts
- src/types/index.ts
- mock-agent-card.ts
- DataTransferPolyfill
- MockSSEClient
- MockSSEClient
- MockSSEClient
- useChatWidget
- react/index.ts

## God Nodes (most connected - your core abstractions)
1. `AgentCard` - 45 edges
2. `A2AClient` - 33 edges
3. `SessionManager` - 29 edges
4. `useChatStore` - 28 edges
5. `ChatSession` - 26 edges
6. `HttpClient` - 26 edges
7. `AuthConfig` - 26 edges
8. `ChatInterface` - 23 edges
9. `SSEClient` - 21 edges
10. `Message` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ChatState` --references--> `ChatSession`  [EXTRACTED]
  react/store/chatStore.ts → src/api/history-types.ts
- `ChatState` --references--> `Message`  [EXTRACTED]
  react/store/chatStore.ts → src/api/history-types.ts
- `AuthPartState` --inherits--> `AuthRequiredPart`  [EXTRACTED]
  react/components/Message/AuthenticationMessage.tsx → src/client/types.ts
- `Message` --references--> `AuthRequiredPart`  [EXTRACTED]
  react/types/index.ts → src/client/types.ts
- `useChatWidget()` --calls--> `useA2A()`  [EXTRACTED]
  react/hooks/useChatWidget.ts → src/react/use-a2a.ts

## Import Cycles
- None detected.

## Communities (40 total, 6 thin omitted)

### Community 0 - "history-types.ts"
Cohesion: 0.06
Nodes (45): createHistoryApi(), HistoryApi, HistoryApiClient, HistoryApiConfig, JsonRpcRequest, IMPORTANT: The method name is "context/update" (singular), not "contexts/update", extractAuthEventFromMessage(), extractLastMessage() (+37 more)

### Community 1 - "errors.ts"
Cohesion: 0.13
Nodes (16): formatErrorMessage(), getUserFriendlyErrorMessage(), A2AError, AuthenticationError, createJsonRpcError(), extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorCode (+8 more)

### Community 2 - "a2a-client.ts"
Cohesion: 0.08
Nodes (43): A2AClient, A2AClientConfig, WaitForCompletionOptions, HttpClient, AuthConfig, AuthRequiredEvent, AuthRequiredHandler, HttpClientOptions (+35 more)

### Community 3 - "agent-discovery.ts"
Cohesion: 0.16
Nodes (7): AgentDiscoveryOptions, CacheEntry, AgentRegistry, AgentSummary, EnterpriseAgentRegistry, PublicAgentRegistry, AgentCardSchema

### Community 4 - "plugins/index.ts"
Cohesion: 0.08
Nodes (18): AnalyticsConfig, AnalyticsEvent, AnalyticsPlugin, LoggerConfig, LoggerPlugin, LogLevel, AnalyticsConfig, AnalyticsEvent (+10 more)

### Community 5 - "SessionManager"
Cohesion: 0.10
Nodes (10): LocalStoragePlugin, SessionManager, mockLocalStorage, mockSessionStorage, SessionChangeEvent, SessionData, SessionEventMap, SessionOptions (+2 more)

### Community 6 - "react/components/Message/Message.tsx"
Cohesion: 0.10
Nodes (18): CodeBlockHeader(), CodeBlockHeaderProps, useStyles, escapeAttr(), formatTime(), link(), Message, MessageComponent() (+10 more)

### Community 7 - "ChatInterface"
Cohesion: 0.17
Nodes (10): ChatInterface, ChatInterfaceConfig, ChatEventMap, ChatMessage, ChatOptions, ChatRole, ConversationExport, StreamUpdate (+2 more)

### Community 8 - "SSEClient"
Cohesion: 0.17
Nodes (7): SSEClient, MockEventSource, ErrorHandler, MessageHandler, SSEClientOptions, SSEMessage, SSEParser

### Community 9 - "A2A Chat React Components"
Cohesion: 0.17
Nodes (11): A2A Chat React Components, Components, Features, Hooks, Important: CSS Import Required, Main Component, State Management, TypeScript Support (+3 more)

### Community 12 - "src/react/types/index.ts"
Cohesion: 0.05
Nodes (40): ChatWindow(), ChatWindowProps, useStyles, mockUseChatWidget, CompanyLogo(), CompanyLogoProps, CodeBlockHeader(), CodeBlockHeaderProps (+32 more)

### Community 21 - "AuthRequiredPart"
Cohesion: 0.15
Nodes (19): AuthRequiredPart, ExampleWithHooks(), manualAuthFlow(), AuthenticationMessage(), AuthenticationMessageProps, AuthPartState, useStyles, AuthenticationMessage() (+11 more)

### Community 22 - "src/react/utils/messageUtils.ts"
Cohesion: 0.19
Nodes (14): MessageInput(), MessageInputProps, useStyles, StatusMessage(), StatusMessageProps, useStyles, Attachment, ArtifactData (+6 more)

### Community 23 - "schemas.ts"
Cohesion: 0.09
Nodes (21): AgentCapabilitiesSchema, AgentInterface, AgentInterfaceSchema, AgentProvider, AgentProviderSchema, AgentSkill, AgentSkillSchema, Artifact (+13 more)

### Community 24 - "src/types/index.ts"
Cohesion: 0.22
Nodes (15): createJsonRpcResponseSchema(), createJsonRpcResultSchema(), isJsonRpcError(), isJsonRpcResult(), JsonRpcErrorObjectSchema, JsonRpcErrorSchema, MessageSchema, MessageSendRequestSchema (+7 more)

### Community 25 - "mock-agent-card.ts"
Cohesion: 0.23
Nodes (6): mockAgentCard, mockAgentCard, mockAgentCard, getMockAgentCard(), mockAgentCard, Task

### Community 33 - "useChatWidget"
Cohesion: 0.06
Nodes (36): ChatWindow(), ChatWindowProps, useStyles, CompanyLogo(), CompanyLogoProps, AgentDiscovery, AuthStateExample(), CustomChatImplementation() (+28 more)

### Community 36 - "react/index.ts"
Cohesion: 0.07
Nodes (30): ChatWidget(), useStyles, FileUpload(), FileUploadProps, ChatWidget(), useStyles, FileUpload(), FileUploadProps (+22 more)

## Knowledge Gaps
- **60 isolated node(s):** `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard`, `mockAgentCard`, `mockUseChatWidget` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AgentCard` connect `a2a-client.ts` to `useChatWidget`, `agent-discovery.ts`, `react/index.ts`, `ChatInterface`, `src/react/types/index.ts`, `schemas.ts`, `mock-agent-card.ts`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Why does `Message` connect `react/components/Message/Message.tsx` to `useChatWidget`, `a2a-client.ts`, `plugins/index.ts`, `react/index.ts`, `ChatInterface`, `AuthRequiredPart`, `mock-agent-card.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `A2AClient` connect `a2a-client.ts` to `history-types.ts`, `plugins/index.ts`, `ChatInterface`, `AuthRequiredPart`, `mock-agent-card.ts`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useChatStore` (e.g. with `.addMessage()` and `.clear()`) actually correct?**
  _`useChatStore` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `history-types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06442127773322641 - nodes in this community are weakly interconnected._
- **Should `errors.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13446969696969696 - nodes in this community are weakly interconnected._