# Graph Report - src  (2026-06-22)

## Corpus Check
- 140 files · ~79,356 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 588 nodes · 1463 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d59cb30b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `AgentCard` - 34 edges
2. `SessionManager` - 29 edges
3. `A2AClient` - 28 edges
4. `HttpClient` - 25 edges
5. `ChatInterface` - 23 edges
6. `SSEClient` - 21 edges
7. `Message` - 20 edges
8. `useChatStore` - 19 edges
9. `ServerHistoryStorage` - 19 edges
10. `AuthConfig` - 18 edges

## Surprising Connections (you probably didn't know these)
- `CacheEntry` --references--> `AgentCard`  [EXTRACTED]
  discovery/agent-discovery.ts → types/schemas.ts
- `manualAuthFlow()` --calls--> `openPopupWindow()`  [EXTRACTED]
  examples/obo-authentication.ts → utils/popup-window.ts
- `ChatInterfaceConfig` --references--> `A2AClient`  [EXTRACTED]
  chat/chat-interface.ts → client/a2a-client.ts
- `ChatInterfaceConfig` --references--> `SessionManager`  [EXTRACTED]
  chat/chat-interface.ts → session/session-manager.ts
- `ChatInterface` --references--> `A2AClient`  [EXTRACTED]
  chat/chat-interface.ts → client/a2a-client.ts

## Import Cycles
- 1-file cycle: `react/types/index.ts -> react/types/index.ts`

## Communities (23 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (44): createHistoryApi(), HistoryApi, HistoryApiClient, HistoryApiConfig, JsonRpcRequest, extractAuthEventFromMessage(), extractLastMessage(), isAuthRequiredMessage() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (50): A2AError, AuthenticationError, createJsonRpcError(), extractErrorDetails(), isJsonRpcErrorResponse(), JsonRpcErrorCode, JsonRpcErrorResponse, NetworkError (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (31): A2AClient, A2AClientConfig, mockAgentCard, WaitForCompletionOptions, HttpClient, AuthConfig, AuthRequiredEvent, AuthRequiredHandler (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (14): mockAgentCard, MockSSEClient, AgentDiscovery, AgentDiscoveryOptions, CacheEntry, AgentRegistry, AgentSummary, EnterpriseAgentRegistry (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (12): AnalyticsConfig, AnalyticsEvent, AnalyticsPlugin, LoggerConfig, LoggerPlugin, LogLevel, PluginManager, Plugin (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (10): LocalStoragePlugin, SessionManager, mockLocalStorage, mockSessionStorage, SessionChangeEvent, SessionData, SessionEventMap, SessionOptions (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (18): CodeBlockHeader(), CodeBlockHeaderProps, useStyles, escapeAttr(), formatTime(), link(), Message, MessageComponent() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (10): ChatInterface, ChatInterfaceConfig, ChatEventMap, ChatMessage, ChatOptions, ChatRole, ConversationExport, StreamUpdate (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (7): SSEClient, MockEventSource, ErrorHandler, MessageHandler, SSEClientOptions, SSEMessage, SSEParser

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): A2A Chat React Components, Components, Features, Hooks, Important: CSS Import Required, Main Component, State Management, TypeScript Support (+3 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (20): MessageInput(), MessageInputProps, useStyles, StatusMessage(), StatusMessageProps, useStyles, MessageList(), MessageListProps (+12 more)

### Community 36 - "Community 36"
Cohesion: 0.05
Nodes (47): ChatWidget(), useStyles, ChatWindow(), ChatWindowProps, useStyles, AuthRequiredPart, CompanyLogo(), CompanyLogoProps (+39 more)

## Knowledge Gaps
- **49 isolated node(s):** `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard`, `mockAgentCard`, `mockUseChatWidget` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Message` connect `Community 6` to `Community 0`, `Community 33`, `Community 2`, `Community 3`, `Community 4`, `Community 36`, `Community 7`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `AgentCard` connect `Community 2` to `Community 1`, `Community 3`, `Community 36`, `Community 7`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Why does `A2AClient` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `JsonRpcRequest`, `mockAgentCard`, `mockAgentCard` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07403508771929825 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08516242317822652 - nodes in this community are weakly interconnected._